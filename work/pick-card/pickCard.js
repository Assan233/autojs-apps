/**
 * 常量
 */
const DEVICE_TYPE = {
  k40: 0,
  realmeX: 1,
};
const DEFAULT_STATUS = {
  day: -1,
  start: false,
  end: false,
};
const PICK_TIME = {
  start: { hour: 9, min: 20 },
  end: { hour: 19, min: 10 },
};
// 检查间隔时间
const CHECK_TIME_SPACE = 60 * 1000 * 1;
const SELF_PACKAGE_NAME = "com.script.pickCard";
const MAX_PICK_DELAY = 10; // 执行打卡最大延迟时间，min

/**
 * 全局变量
 */
// 缓存 上下班是否打卡
let workStatus = Object.assign({}, DEFAULT_STATUS);
// 上一次唤醒屏幕的时间
let lastWakeUpTime = Date.now();

/**
 * 功能代码
 */
function main() {
  // pickCard();
  scheduleRandomProgramExecution(pickCard);
}
main();

/**
 * 打卡
 */
function pickCard() {
  // 唤醒屏幕
  device.wakeUp();
  waitTime(5, "唤醒屏幕");
  const points = getPoints(DEVICE_TYPE.k40);

  // 启动应用
  var packageName = app.getPackageName("钉钉");
  launch(packageName);
  waitTime(15, "等待钉钉启动");

  // 消除更新提示
  const updateDom = text("暂不更新").findOnce();
  updateDom && updateDom.click();
  waitTime(3, "消除更新提示");

  // 重置钉钉tab聚焦
  text("消息").findOnce().parent().parent().click();
  waitTime(5, "切换消息Tab");

  // 打开工作台
  text("工作台").findOnce().parent().parent().click();
  waitTime(8, "打开工作台");

  // 打开考勤系统
  click(points.kqPoint[0], points.kqPoint[1]);
  waitTime(8, "打开考勤系统");

  // 打卡
  click(points.pickPoint[0], points.pickPoint[1]);
  waitTime(5, "打卡");

  // 退出app
  // killApp("钉钉");
  // waitTime(8, `完成打卡：${new Date().toLocaleString()}`);

  // 唤醒打卡软件到前台
  launch(SELF_PACKAGE_NAME);
  waitTime(5, "唤醒打卡软件到前台");
}

/**
 * 获取打卡所需坐标
 * @param {string} type DEVICE_TYPE
 */
function getPoints(type) {
  switch (type) {
    case DEVICE_TYPE.k40: {
      return {
        kqPoint: [150, 1380],
        pickPoint: [540, 1900],
      };
    }
    case DEVICE_TYPE.realmeX: {
      return {
        kqPoint: [130, 1425],
        pickPoint: [530, 1835],
      };
    }
  }
}

/**
 * 更新每日打卡状态
 */
function updateWorkStatus() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  switch (currentHour) {
    // 上班
    case PICK_TIME.start.hour:
      workStatus.day = currentDay;
      workStatus.start = true;
      break;
    // 下班
    case PICK_TIME.end.hour:
      workStatus.day = currentDay;
      workStatus.end = true;
      break;
  }
}
/**
 * 检查WorkStatus状态，确认能不能执行打卡任务
 */
function checkWorkStatus() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // 如果不是同一天，重置 workStatus
  if (currentDay !== workStatus.day) {
    workStatus = Object.assign({}, DEFAULT_STATUS, { day: currentDay });
  }

  const allowStart =
    currentHour === PICK_TIME.start.hour && workStatus.start === false;
  const allowEnd =
    currentHour === PICK_TIME.end.hour && workStatus.end === false;

  return allowStart || allowEnd;
}

/**
 * 检查当前时间段 是否需要唤醒屏幕
 */
function checkNeedWakeUp() {
  const now = Date.now();
  const diff = now - lastWakeUpTime;
  const needWakeUp = diff > 1000 * 60 * 60 * 8; // 8小时唤醒一次
  // 唤醒屏幕
  if (needWakeUp) {
    waitTime(1, "应用激活-1");
    device.wakeUp();
    waitTime(1, "应用激活-2");
    click(500, 1000);
    waitTime(1, "应用激活-3");
    click(500, 1500);
    waitTime(1, "应用激活-4");
    click(1000, 1500);
    waitTime(1, "应用激活-5");

    lastWakeUpTime = now;
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

    // 检查是否需要唤醒屏幕
    checkNeedWakeUp();

    // 检查是否是工作日，并且在指定的时间范围内
    if (
      weekdays.includes(currentDay) &&
      ((currentHour === PICK_TIME.start.hour &&
        currentMinute >= PICK_TIME.start.min) ||
        (currentHour === PICK_TIME.end.hour &&
          currentMinute >= PICK_TIME.end.min))
    ) {
      // 检查是否可以打卡
      const allowPickCard = checkWorkStatus();
      if (allowPickCard) {
        // 更新每日打卡状态
        console.log("更新打卡状态");
        updateWorkStatus();

        // 随机生成一个介于 0 和 10 之间的整数，表示随机分钟数
        const randomMinutes = Math.floor(Math.random() * (MAX_PICK_DELAY - 1));
        // const randomMinutes = 0;

        // 计算实际执行时间
        const executionTime = new Date(now.getTime() + randomMinutes * 60000);

        // 执行程序
        console.log(`计划在 ${executionTime.toLocaleTimeString()} 执行程序`);
        setTimeout(executeProgram, randomMinutes * 60000);
      }
    }
  }, CHECK_TIME_SPACE); // 每隔一段时间检查一次
}

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
          // 点击-强行停止
          text("强行停止").waitFor();
          var killBtn = text("强行停止").findOne().bounds();
          click(killBtn.centerX(), killBtn.centerY());
          waitTime(1, "点击-强行停止");

          // 点击-确定
          forcedStop.click();
          text("强行停止").findOne().click();
          waitTime(1, "点击 强行停止-确定");
          home();
          break;
        }
      }
    }
  }
}
