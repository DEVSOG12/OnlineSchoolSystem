let localVideo = new Vue({
    el:'#localVideo',
    data:{
        client:{},
        stream:null,
        tab:'',
        dbRef:null,
        playing:false,
        clientReady: null
    },
    mounted(){
        let client = AgoraRTC.createClient({
            mode: 'live',
            codec: "h264"
        });
        client.init(appid, () => console.log("AgoraRTC client initialized"), handleFail);
        let self = this;
        
        self.client = client;
        self.dbRef = database.ref(`/${appid}/${channelid}/video`);
        self.dbRef.onDisconnect().set(null);

        self.clientReady = new Promise((res,rej)=>{
            self.client.join(null, channelid, null, (uid) => {
                self.dbRef.set(uid);
                res(true);
            }, handleFail);
        });

        self.$refs.temp.addEventListener('play', (event) => {
            if(!self.$refs.temp.paused){
                self.playing=true;
            }
        });

    },
    watch:{
        tab(newVal,oldVal) {
            if(newVal!=='test2'){
                this.playing=false;
            }
        },
        playing(newVal,oldVal){
            if(!newVal){
                this.$refs.temp.pause();
            }
        }
    },
    methods:{
        start(event){
            let file  = event.target.files[0];
            let self = this;
            self.$refs.temp.src = URL.createObjectURL(file);
            self.$refs.temp.load();
            self.$refs.temp.volume = 0.2;
            self.$refs.temp.play().then(()=> {
                self.playing=true;
                const ms = self.$refs.temp.captureStream();
                self.clientReady.then((uid) => {

                    // self.cleanup();
                    if(!self.stream){
                        self.stream = AgoraRTC.createStream({
                            streamId: uid,
                            video: true,
                            audio: true,
                            videoSource: ms.getVideoTracks()[0],
                            audioSource: ms.getAudioTracks()[0]
                        });
                        self.stream.setVideoProfile(quality);
                        self.stream.init(function () {
                            self.client.publish(self.stream);
                        });
                    }
                    else {
                        self.stream.replaceTrack(ms.getVideoTracks()[0]);
                        self.stream.replaceTrack(ms.getAudioTracks()[0]);
                    }

                    console.log(`App id : ${appid}\nChannel id : ${channelid}`);
                });
            })
        },
        // cleanup(){
        //     if(this.stream){
        //         // this.client.unpublish(this.stream);
        //         this.stream.close();
        //         this.stream=null;
        //     }
        // }
    }

});