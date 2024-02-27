/**
 * 调用地铁二维码 脚本
 */
function main() {
  // 返回桌面
  home();
  sleep(1000);

  // 长按 厦门地铁软件
  longClick(635, 2205);

  // 点击交通码
  text("厦门交通码").findOne(2000).parent().click();
}
main();
