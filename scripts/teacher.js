let listApp, appDidMount, resolveMount, appDidCreate, resolveCreate;
appDidMount=new Promise(res=>resolveMount=res);
appDidCreate=new Promise(res=>resolveCreate=res);

let handleFail = function(err){
    console.log("Error : ", err);
};

let client = AgoraRTC.createClient({
    mode:'live',
    codec:'h264'
});

let studRef = database.ref(`/${appid}/${channelid}/students`);

let main = document.getElementById('main');

let sideNavApp = new Vue({
    el:'#trigger',
    data:{
        open:false
    },
    watch:{
        open:function (newVal, oldVal) {
            this.$nextTick(function () {
                appDidMount.then(function () {
                    if(newVal){
                        listApp.$refs.slide.style.transform = 'translateX(0)';
                        main.style.marginLeft='300px';
                    }
                    else{
                        listApp.$refs.slide.style.transform = 'translateX(-300px)';
                        main.style.marginLeft='0';
                    }
                });
            });
        }
    }
});

studRef.once('value').then(function (snapshot) {
    let initVal = snapshot.val(), start;
    if(initVal){
        let keys = Object.keys(initVal).sort();
        start = keys.findIndex(e=>initVal[e].video===true);
    }
    else{
        start =0;
        initVal ={};
    }

    listApp = new Vue({
        el:'#list-app',
        created:function(){
            let self = this;
            studRef.on('value',function (snapshot) {
                self.students = snapshot.val();
            });
            namesRef.on('value',function (snap1) {
                self.names=snap1.val();
                rqRef.on("value",function (snap2) {
                    let raise = snap2.val();
                    if(self.names[raise]){
                        self.raise= raise;
                    }
                    else{
                        rqRef.set(null);
                        raisedRef.set(false);
                    }
                });
            });
            raisedRef.on("value",function(snap3){
                self.raised=snap3.val();
            });
            resolveCreate(true);
        },
        mounted:function(){
            this.$nextTick(function () {
                resolveMount(true);
            });
        },
        data: {
            students:initVal,
            start:(start!==-1)?start:0,
            streams:{},
            isFirstBatchLoaded:(start !== -1),
            sz:5,
            raise:null,
            raised:false,
            names:{}
        },
        computed:{
            uids:function () {
                return Object.keys(this.students||{}).sort();
            },
            imgLoc(){
                return `./assets/letters/${this.names[this.raise][0].toUpperCase()}.png`
            },
            len:function(){
                return this.uids.length;
            },
            isAtStart:function(){
                return (this.start===0);
            },
            isAtEnd:function(){
                if (this.len>this.sz)
                    return (this.start>=this.len-this.sz);
                else
                    return true
            },
            currIds:function(){
                if(this.len>0) {
                    let uidsArr = this.uids.slice(this.start, this.start + this.sz);
                    // if (this.raised && !uidsArr.includes(this.raise)) {
                    //     uidsArr.shift();
                    //     uidsArr.unshift(this.raise);
                    //     return uidsArr;
                    // } else
                        return uidsArr;
                }
                else{
                    return [];
                }

            },
            end:function(){
                return this.start + this.currIds.length;
            },
            currStreams:function () {
                let keys = Object.keys(this.streams);
                return this.currIds.map(id=>(keys.includes(id))?this.streams[id]:null);
                // return this.streams.filter(e=>this.currIds.includes(e.streamId))
            }
        },
        watch:{
            uids:function(){
                this.ensure(0);
            },
            currIds:function (newVal,oldVal) {
                console.log("watch method activated!");
                let updates = {};
                if(!this.isFirstBatchLoaded){
                    newVal.map(v=>updates[`/${v}/video`]=true);
                    this.isFirstBatchLoaded = true;
                }
                else if(this.len>0){
                    let currDb = Object.keys(this.students);
                    newVal.map(v=>(!oldVal.includes(v)&&currDb.includes(v))?updates[`/${v}/video`]=true:null);  // Enable updates
                    oldVal.map(v=>(!newVal.includes(v)&&currDb.includes(v))?updates[`/${v}/video`]=false:null); // Disable updates
                }
                // console.log("firebase updates",newVal,oldVal);
                this.updateFirebase(updates);
            },
            currStreams:function (newVal,oldVal) {
                newVal.map(function (stream) {
                    if(stream){
                        client.subscribe(stream);
                    }
                    else
                        console.log("stream not yet received!");
                });
                // this.$nextTick(function () {
                //
                // });
            }
        },
        methods:{
            updateFirebase:function (updates) {
                studRef.update(updates);
            },
            grant(){
                raisedRef.set(true);
                firebase.database().ref(`${appid}/${channelid}/students/${this.raise}/audio`).set(true);
                let source = this.uids.indexOf(String(this.raise));
                // if(this.start>source)
                    this.ensure(source-this.start);
                // else
                //     this.ensure(this.)
            },
            revoke(){
                raisedRef.set(false);
                rqRef.set(null);
                studRef.child(`/${this.raise}/audio`).set(false);
                this.raise=null;
                this.raised=false;
            },
            ensure:function(inc){

                let st;

                if(this.len>this.sz){

                    // length changes
                    if(this.start+this.sz<=this.len)
                        st = this.start;                    // If bounds is within length
                    else
                        st = this.len-this.sz;              // If bounds go out of length

                    // inc changes
                    if (st + inc >= this.len - this.sz) {   // Increment overflows more than length
                        st= this.len - this.sz;
                    }
                    else if (st + inc < 0){
                        st=0;
                    }
                    else {
                        st+=inc;
                    }
                }
                else {
                    st = 0;
                }
                this.start = st;
            }
        }
    });


});

let meApp = new Vue({
    el:'#me',
    data:{
        stream:{},
        audio:true
    },
    computed: {
        loading:function () {
            return (Object.entries(this.stream).length === 0 && this.constructor === Object)
        }
    },
    methods: {
        mute:function () {
            if(this.stream.muteAudio())this.audio=false;
        },
        unmute:function () {
            if(this.stream.unmuteAudio())this.audio=true;
        },
        toggleAudio(){
            (this.audio)?this.mute():this.unmute();
        }
    }
});

client.init(appid, () => {

    client.join(null, channelid, null , (uid) => {

        let teacher = database.ref(`/${appid}/${channelid}/teacher`);
        teacher.set(uid);
        teacher.onDisconnect().set(null);

        let localStream = AgoraRTC.createStream({
            streamId: uid,
            video: true,
            audio: true
        });
        localStream.init(()=>{
            meApp.stream=localStream;
            localStream.play('me');
            client.publish(localStream);
        });


        console.log(`App id : ${appid}\nChannel id : ${channelid}\n uid : ${uid}`);
    }, (err)=>{

        console.error(err);
    });

}, handleFail);

client.on('stream-added',function (evt) {
    appDidCreate.then(()=>{
        Vue.set(listApp.streams,evt.stream.streamId,evt.stream);
    });
    console.log("added new stream", evt);
});

client.on('stream-removed',function (evt) {
    appDidCreate.then(()=>{
        Vue.delete(listApp.streams,evt.stream.streamId);
    });
    console.log("remove video stream",evt);
});

client.on('stream-subscribed',function (evt) {
    appDidMount.then(function(){
        // console.log("subscribed to: ",evt.stream.streamId);
        Vue.nextTick(function () {
            evt.stream.play(String(evt.stream.streamId));
        });
    });
});

client.on("mute-video", function (evt) {
    let uid = evt.uid;
    console.log("mute video" + uid);
    // client.unsubscribe(listApp.streams[uid]);
    // client.subscribe(listApp.streams[uid]);
    // // evt.stream.unmuteVideo();
});