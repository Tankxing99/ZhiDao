const { QuickStartPoints, QuickStartSteps } = require("./constants");

Page({
  data: {
    knowledgePoints: QuickStartPoints,
    steps: QuickStartSteps,
  },
  onLoad: function () {
    console.log("Welcome to Mini Code");
  },

  copyCode(e) {
    const code = e.target?.dataset?.code || "";
    tt.setClipboardData({
      data: code,
      success: (res) => {
        tt.showToast({
          title: "已复制",
        });
      },
      fail: (err) => {
        // 隐私协议中未定义相关隐私信息类型，详见配置隐私协议 https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/basic-capacities/privacy-agreement
        if (err.errNo === 10202) {
          return tt.showToast({
            icon: "none",
            title: "复制失败，请先配置隐私协议",
          });
        }

        tt.showToast({
          icon: "fail",
          title: "复制失败",
        });
      },
    });
  },

  copyLink(e) {
    const link = e.target?.dataset?.url || "";
    tt.setClipboardData({
      data: link,
      success: () => {
        tt.showToast({
          icon: "none",
          title: "已复制链接，请在浏览器中打开",
        });
      },
      fail: (err) => {
        // 隐私协议中未定义相关隐私信息类型，详见配置隐私协议 https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/basic-capacities/privacy-agreement
        if (err.errNo === 10202) {
          return tt.showToast({
            icon: "none",
            title: "链接复制失败，请先配置隐私协议",
          });
        }

        tt.showToast({
          icon: "fail",
          title: "链接复制失败",
        });
      },
    });
  },

  jumpPage(e) {
    const { type } = e.currentTarget.dataset;
    tt.navigateTo({
      url: `/pages/exampleDetail/exampleDetail?type=${type}`,
    });
  },
});
