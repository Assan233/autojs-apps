function main(){
  pickCard();
}

function pickCard() {
  // 启动应用
  var appName = app.getPackageName('钉钉');
  console.log(appName);
  launch(appName);
  waitTime(6,"等待钉钉启动");
  // 打开工作台
  text("工作台").findOnce().parent().click();
  waitTime(1,"打开工作台");
  
  // 打开考勤系统
  // text("考勤系统").findOnce().parent().click();
  click(150,1380)
  waitTime(5,"打开考勤系统");

  // 打卡
  click(540, 1900)
  waitTime(5,"重试打卡");
  click(540, 1900)
  waitTime(5,"重试打卡");


  const pid = android.os.Process.myPid()
  android.os.Process.killProcess(pid);
}
main()


/**  ====== utils ======== **/
function waitTime(seconds, txt) {
  var index = 0
  var i = seconds;
  var msg = txt || "倒计时";
  if (1 > seconds && seconds > 0) {
      index++;
      log(msg);
      sleep(seconds * 1000)
      return;
  }
  var show = true;
  while (i >= 0) {
      show = true;
      if (i > 100 && i % 5 != 0) {
          show = false;
      }
      if (show) {
          log(msg + "-->" + i);
      }
      if (i % 5 == 0) {
          index++;
      }
      if (i != 0) {
          sleep(1000)
      }
      i--;
  }
}