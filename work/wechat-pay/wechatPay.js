/**
 * 调用 微信付款码 脚本
 */
function main() {
  // 返回桌面
  home();
  sleep(1000);

  // 滑动到-1屏
  swipe(100, 800, 600, 800, 300);
  sleep(600);

  // 点击微信付款码
  click(550, 610);
}
main();