/*global window, Sketchpad, Colorpalette*/

function initSketchpad() {
    "use strict";
    //create sketchpad on #sketchpad element
    var sketchpad = new Sketchpad({
        containerEl: document.getElementById("sketchpad"),
        createPageConfig: {
            no: 1,
        }
    });
    // avaliable tools `src/sketchpad.tool.*.js`, ex. "pen", "colouring", "line", "rect", "circ"...
    var toolId = "pen";
    var tool = sketchpad.setTool(toolId).getCurrentTool();

    //create colorpalette on #colorpalette element
    var colorpalette = new Colorpalette({
        containerEl: document.getElementById("colorpalette")
    }).on("change", function (e) { //bind on change event
        sketchpad.setTool(toolId).getCurrentTool().setColor(e.color.red, e.color.green, e.color.blue, e.color.alpha);
    }).setColor(tool.setColor(0, 121, 255, 1).getColor()); //set default color

    // bind on change size event
    document.getElementById("size").addEventListener("change", function (e) {
        sketchpad.getCurrentTool().setSize(e.target.value);
    });
    document.getElementById("size").value = tool.setSize(2).getSize();//set default size

    // bind eraser button
    document.getElementById('eraser').addEventListener("click", function () {
        sketchpad.setTool("eraser");
    });

    //make objects below visible in global scope
    window.sketchpad = sketchpad;
    window.colorpalette = colorpalette;
    window.tool = tool;
}


// let canvas = document.getElementsByTagName('canvas')[5]; // canvas which is to be streamed to agora
// let ctx = canvas.getContext("2d");
// ctx.fillStyle = "white";
// ctx.fillRect(-canvas.width, -canvas.height, 2*canvas.width, 2*canvas.height);


let wbApp = new Vue({
    el:'#whiteboard',
    mounted(){
        this.$nextTick(function () {
            initSketchpad();
            let canvas = document.getElementsByTagName('canvas')[2]; // canvas which is to be streamed to agora
            let client = AgoraRTC.createClient({
                mode: 'live',
                codec: "h264"
            });

            // Defines a client for Real Time Communication
            client.init(appid,() => console.log("AgoraRTC client initialized") ,handleFail);

            // The client joins the channel
            client.join(null,channelid,null, (uid)=>{
                let frameRate = 30;
                let teacher = database.ref(`/${appid}/${channelid}/whiteboard`);
                teacher.set(uid);
                teacher.onDisconnect().set(null);

                setupPing(canvas);
                let mediaStream = canvas.captureStream();  // convert to mediaStream
                let videoSource = mediaStream.getVideoTracks()[0];  // get the videoSource

                let localStream = AgoraRTC.createStream({
                    streamId:uid,
                    video: true,
                    audio: false,
                    videoSource: videoSource // Pass in the video source to agora
                });
                localStream.setVideoProfile(quality);
                localStream.init(function(){

                    client.publish(localStream); // Publish it to the channel
                });
                console.log(`App id : ${appid}\nChannel id : ${channelid}`);
            },handleFail);
        });
    },
});