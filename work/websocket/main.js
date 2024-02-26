importPackage(Packages["okhttp3"]); //导入包
var client = new OkHttpClient.Builder().retryOnConnectionFailure(true).build();
var request = new Request.Builder().url("ws://192.168.1.108:3000").build(); //vscode  插件的ip地址，
client.dispatcher().cancelAll();//清理一次
myListener = {
    onOpen: function (webSocket, response) {
        print("onOpen");
        //打开链接后，想服务器端发送一条消息
        var json = {};
        json.type="hello";
        json.data= {device_name:"模拟设备",client_version:123,app_version:123,app_version_code:"233"};
        var hello=JSON.stringify(json);
        webSocket.send(hello);
    },
    onMessage: function (webSocket, msg) { //msg可能是字符串，也可能是byte数组，取决于服务器送的内容
        print("msg");
        print(msg);
    },
    onClosing: function (webSocket, code, response) {
        print("正在关闭");
    },
    onClosed: function (webSocket, code, response) {
        print("已关闭");
    },
    onFailure: function (webSocket, t, response) {
        print("错误");
        print( t);
    }
}

var webSocket= client.newWebSocket(request, new WebSocketListener(myListener)); //创建链接

setInterval(() => { // 防止主线程退出
    
}, 1000);
