let rtm = AgoraRTM.createInstance(appid);
let chatApp = new Vue({
    el:'#chat',
    data:{
        messages:[],
        name:'test',
        text:'',
        isTeacher:false,
        teacher:'',
        disabled:true,
        ch:{},
        names:{}
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
    },
    methods:{
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
        }
    }
});

namesRef.on('value',function (snapshot) {
    chatApp.names = snapshot.val();
});
