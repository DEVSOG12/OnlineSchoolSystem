let rtm = AgoraRTM.createInstance(appid);
let client = AgoraRTC.createClient({
    mode:'live',
    codec:'h264'
});



let studApp = new Vue({
    el:"#main",
    data:{
        streams:{},
        teacher:null,
        whiteboard:null,
        pdf:null,
        video:null,
        messages:[],
        text:'',
        channel:channelid,
        isTeacher:false,
        disabled:true,
        ch:{},
        names:{},
        raise:'',
        isRaiseBtnDisabled:true
    },
    mounted(){
        let self = this;
        let teacher = database.ref(`/${appid}/${channelid}/teacher`);
        rtm.login({token: null, uid: String(uid)}).then(() => {
            console.log('AgoraRTM client login success');
            const channel = rtm.createChannel(channelid);
            teacher.on('value',function (snapshot) {
                self.teacher = snapshot.val();
            });
            channel.join().then(() => {
                self.ch = channel;
                self.disabled=false;
                channel.on('ChannelMessage', ({text}, senderId) => {
                    self.add(text,senderId===uid,senderId===self.teacher,senderId);
                    console.log(`[${senderId}]: ${text}`);
                });
            });
        }).catch(err => {
            console.log('AgoraRTM client login failure', err);
        });
        rqRef.on("value",function (snapshot) {
            let val = snapshot.val();
            self.raise = val;
            console.log("rq ref: ",!!val);
            self.isRaiseBtnDisabled = !!val;
        });
    },
    watch:{
        teacher(){
            this.teacherSub();
        },
        whiteboard(){
            this.whiteboardSub();
        },
        pdf(){
            this.pdfSub();
        },
        video(){
            this.videoSub();
        },
        raise(){
            this.raiseSub();
        },
        streams(){
            this.subHandle();
        }
    },
    methods:{
        teacherSub(){
            if(this.streams[this.teacher]){
                client.subscribe(this.streams[this.teacher]);
            }
        },
        whiteboardSub(){
            if(this.streams[this.whiteboard]){

                client.subscribe(this.streams[this.whiteboard]);
            }
        },
        pdfSub(){
            if(this.streams[this.pdf]){

                client.subscribe(this.streams[this.pdf]);
            }
        },
        raiseSub(){
            if(this.streams[this.raise]){
                client.subscribe(this.streams[this.raise],{video:false,audio:true});
            }
        },
        videoSub(){
            if(this.streams[this.video]){

                client.subscribe(this.streams[this.video]);
            }
        },
        subHandle(){
            this.teacherSub();
            this.whiteboardSub();
            this.pdfSub();
            this.videoSub();
        },
        add(message,isLocal,isTeacher,usr){
            const isScrolledToBottom = this.$refs.scroll.scrollHeight - this.$refs.scroll.clientHeight <= this.$refs.scroll.scrollTop + 1;
            this.messages.push({message,isLocal,isTeacher,usr:this.names[usr]});
            this.$nextTick(function () {
                if (isScrolledToBottom) {
                    this.$refs.scroll.scrollTop = this.$refs.scroll.scrollHeight - this.$refs.scroll.clientHeight;
                }
                this.text='';
            });
        },
        sendMsg(){
            let self = this;
            this.ch.sendMessage({text: self.text}).then(() => {
                this.add(self.text,true,self.isTeacher,uid);
                console.log("sent");
            }).catch(error => {
                console.log("error sending", error);
            });
        },
        raiseRequest(){
            rqRef.set(uid);
        }
    }
});



['teacher','video','whiteboard','pdf','names'].map((s)=>{
    database.ref(`/${appid}/${channelid}/${s}`).on('value',function(snapshot){
        studApp[s]=snapshot.val();
        console.log(s+" updated: ",snapshot.val());
    });
});

let handleFail = function(err){
    console.log("Error : ", err);
};




client.init(appid, () => {

    client.join(null, channelid, uid , (uid) => {
        let myRef = database.ref(`/${appid}/${channelid}/students/${uid}`);
        myRef.set({audio:false,video:false});
        myRef.onDisconnect().set(null);
        // client.on("connection-state-change", function(evt) {
        //     console.log(evt.prevState, evt.curState);
        //     // stateM
        // });
        let localStream = AgoraRTC.createStream({
            streamId: uid,
            video: true,
            audio: true
        });

        localStream.init(function () {
            localStream.muteVideo();
            localStream.muteAudio();
            localStream.play('me',{fit: "contain"});
            myRef.on("value",function(snapshot){
                let details = snapshot.val();
                console.log("Current: ");
                console.log("Video: ",localStream.isVideoOn(),"Audio",localStream.isAudioOn());
                console.log("Change to: ");
                console.log("Video: ",details.video,"Audio",details.audio);
                if(details.video&&!localStream.isVideoOn()){
                    client.setClientRole("host");
                    localStream.unmuteVideo();
                }
                else if(!details.video&&localStream.isVideoOn()){
                    console.log("Tempted to mute!");
                    // localStream.muteVideo();
                }
                if(details.audio&&!localStream.isAudioOn()){
                    client.setClientRole("host");
                    localStream.unmuteAudio();
                    M.toast({html: 'Teacher approved your request!'});
                }
                else if(!details.audio&&localStream.isAudioOn()){
                    localStream.muteAudio();
                    M.toast({html: 'Teacher has muted you.'});
                }
                if(details.video||details.audio){
                    client.publish(localStream);
                }
                else {
                    client.unpublish(localStream);
                }

            });
        });

        console.log(`App id : ${appid}\nChannel id : ${channelid}\n uid : ${uid}`);
    }, (err)=>{
        uidApp.message='Error could not join the channel. Check logs';
        console.error(err);
    });

}, handleFail);

client.on('stream-added',function (evt) {
    Vue.nextTick(function () {
        console.log("added new stream", evt);
        Vue.set(studApp.streams,evt.stream.streamId,evt.stream);
    });
});

function getId(streamId){
    let id = '';
    if (streamId===studApp.whiteboard){
        id='whiteboard'
    }
    else if (streamId===studApp.video){
        id='video'
    }
    else if (streamId===studApp.pdf){
        id='pdf'
    }
    else if (streamId===studApp.teacher){
        id= 'teacher';
    }
    else if (streamId===studApp.raise){
        id= 'remote';
    }
    console.log("get id", streamId, id);
    return id;
}
client.on('stream-removed',function (evt) {
    Vue.delete(studApp.streams,evt.stream.streamId);
    let id = getId(evt.stream.streamId);
    evt.stream.close();
    if(studApp.$refs[id])
        studApp.$refs[id].innerHTML='';
    console.log("remove video stream",evt);
});
client.on('stream-subscribed',function (evt) {
    Vue.nextTick(function () {
        let a = getId(evt.stream.streamId);
        console.log("subscribe to :",a);
        if(a){
            if(studApp.$refs[a])
                studApp.$refs[a].innerHTML='';
            if(a!=='teacher'){
                evt.stream.play(a,{fit: "contain"});
            }
            else {
                evt.stream.play(a);
            }

        }
    });
    console.log("subscribed to: ",evt.stream.streamId);
});
