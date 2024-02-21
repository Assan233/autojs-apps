function main() {
  pickCard();
}

function pickCard() {
  // 启动应用
  var packageName = app.getPackageName("钉钉");
  killApp(packageName);

  console.log(packageName);
  launch(packageName);
  waitTime(6, "等待钉钉启动");
  // 打开工作台
  text("工作台").findOnce().parent().click();
  waitTime(1, "打开工作台");

  // 打开考勤系统
  // text("考勤系统").findOnce().parent().click();
  click(150, 1380);
  waitTime(5, "打开考勤系统");

  // 打卡
  click(540, 1900);
  waitTime(5, "重试打卡");
  click(540, 1900);
  waitTime(5, "重试打卡");

  // 退出app
  killApp(packageName);
}
main();

/**  ====== utils ======== **/
function waitTime(seconds, txt) {
  var index = 0;
  var i = seconds;
  var msg = txt || "倒计时";
  if (1 > seconds && seconds > 0) {
    index++;
    log(msg);
    sleep(seconds * 1000);
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
      sleep(1000);
    }
    i--;
  }
}

function killApp(packageName) {
  let forcedStopStr = ["结束", "停", "强"];

  if (packageName) {
    app.openAppSetting(packageName); //进入应用设置信息
    text(packageName).waitFor(); //等待查询到名字出现

    for (var i = 0; i < forcedStopStr.length; i++) {
      if (textContains(forcedStopStr[i]).exists()) {
        //判定关键字是否存在
        sleep(500);
        let forcedStop = textContains(forcedStopStr[i]).findOne();

        // 存在关键字
        if (forcedStop.enabled()) {
          // 点击-结束运行
          text("结束运行").waitFor();
          var killBtn = text("结束运行").findOne().bounds();
          click(killBtn.centerX(), killBtn.centerY());
          waitTime(1, "点击-结束运行");

          // 点击-确定
          forcedStop.click();
          text("确定").findOne().click();
          waitTime(1, "点击-确定");
          home();
          break;
        }
      }
    }
  }
}
