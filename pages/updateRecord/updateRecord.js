const cloud = getApp().globalData.cloud;
const { parseJson, toastError } = require("../../utils/index");

Page({
  data: {
    haveGetRecord: false,
    record: "",

    category: "",
  },

  onLoad(options) {
    this.setData({
      category: options.category,
    });
  },

  onShow() {
    tt.showLoading({
      title: "加载中",
    });
    cloud.callContainer({
      path: "/select_record", // 后端服务实际的调用路径
      init: {
        method: "GET",
        timeout: 60000, //ms
      },
      success: ({ statusCode, data }) => {
        tt.hideLoading();
        const parsedData = parseJson(data);
        if (statusCode !== 200) {
          return toastError(statusCode, parsedData.error);
        }
        if (parsedData.code !== 0) {
          return tt.showToast({
            icon: "none",
            title: parsedData.message,
          });
        }
        this.setData({
          record: parsedData.data.data,
        });
      },
      fail: (response) => {
        tt.hideLoading();
        console.log("fail:", response);
        const errMsg =
          response.errMsg.split("Cloud.callContainer:fail")[1] ||
          response.errMsg;
        if (response.errMsg.includes("route info not found")) {
          return tt.showToast({
            icon: "none",
            title: "路径不存在，请检查",
          });
        }
        tt.showToast({
          icon: "none",
          title: errMsg,
        });
      },
    });
  },

  insertRecord() {
    tt.navigateTo({
      url: `/pages/updateRecordResult/updateRecordResult?category=${this.data.category}`,
    });
  },

  updateRecord() {
    tt.navigateTo({
      url: `/pages/updateRecordResult/updateRecordResult?category=${this.data.category}`,
    });
  },
});
