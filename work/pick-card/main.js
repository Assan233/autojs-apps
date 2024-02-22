function main() {
  scheduleRandomProgramExecution(pickCard);
}

/**
 * 打卡
 */
function pickCard() {
  device.wakeUp()
  waitTime(5, "唤醒屏幕");

  // 启动应用
  var packageName = app.getPackageName("钉钉");
  launch(packageName);
  waitTime(6, "等待钉钉启动");

  // 打开工作台
  text("工作台").findOnce().parent().click();
  waitTime(3, "打开工作台");

  // 打开考勤系统
  // text("考勤系统").findOnce().parent().click();
  click(150, 1380);
  waitTime(8, "打开考勤系统");

  // 打卡
  click(540, 1900);
  waitTime(5, "重试打卡");
  click(540, 1900);
  waitTime(5, "重试打卡");

  // 退出app
  killApp("钉钉");
  console.log(`完成打卡：${new Date().toLocaleString()}`);
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

function killApp(appName) {
  let forcedStopStr = ["结束", "停", "强"];
  var packageName = app.getPackageName(appName);

  if (packageName) {
    app.openAppSetting(packageName); //进入应用设置信息
    text(appName).waitFor(); //等待查询到名字出现

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

/**
 * 工作日固定时间执行程序
 * @param {any} executeProgram 执行的程序
 */
function scheduleRandomProgramExecution(executeProgram) {
  const weekdays = [1, 2, 3, 4, 5]; // 1 表示星期一，以此类推

  setInterval(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 检查是否是工作日，并且在指定的时间范围内
    if (
      weekdays.includes(currentDay) &&
      ((currentHour === 9 && currentMinute >= 10) ||
        (currentHour === 19 && currentMinute >= 0))
    ) {
      // 随机生成一个介于 -10 和 10 之间的整数，表示随机分钟数
      const randomMinutes = Math.floor(Math.random() * 21) - 10;

      // 计算实际执行时间
      const executionTime = new Date(now.getTime() + randomMinutes * 60000);

      // 执行程序
      console.log(`计划在 ${executionTime.toLocaleTimeString()} 执行程序`);
      setTimeout(executeProgram, randomMinutes * 60000);
    }
  }, 60000); // 每隔一分钟检查一次
}
