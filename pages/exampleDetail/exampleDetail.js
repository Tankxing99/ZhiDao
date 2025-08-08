const cloud = getApp().globalData.cloud;
const isLogin = getApp().globalData.isLogin;

const { parseJson, toastError } = require("../../utils/index");

Page({
  data: {
    type: "",

    haveGetOpenId: false,
    openId: "",

    haveGetTextAntidirt: false,
    hit: false,
    text: "",

    haveGetImgSrc: false,
    imgSrc: "",
    filePath: "",

    haveGetRecord: false,
    record: "",
  },
  onLoad: async function (options) {
    this.setData({
      type: options?.type,
    });
  },

  getOpenId() {
    tt.showLoading({
      title: "加载中",
    });
    cloud.callContainer({
      path: "/get_open_id", // 后端服务实际的调用路径
      init: {
        method: "GET",
        timeout: 60000, //ms
      },
      success: ({ statusCode, data }) => {
        tt.hideLoading();
        console.log("/get_open_id success:", data);
        const parsedData = parseJson(data);
        if (statusCode !== 200) {
          return toastError(statusCode, parsedData.message || parsedData.error);
        }

        if (parsedData?.code !== 0) {
          return tt.showToast({
            icon: "none",
            title: parsedData.message || parsedData.error,
          });
        }
        this.setData({
          haveGetOpenId: true,
          openId: parsedData.data,
        });
      },
      fail: (response) => {
        tt.hideLoading();
        console.log("/get_open_id fail:", response);
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

  clearOpenId() {
    this.setData({
      haveGetOpenId: false,
      openId: "",
    });
  },

  bindInput(e) {
    this.setData({
      text: e.detail.value,
    });
  },

  getTextAntidirt() {
    if (!this.data.text) {
      return tt.showToast({
        icon: "fail",
        title: "请输入文本",
      });
    }

    tt.showLoading({
      title: "加载中",
    });
    cloud.callContainer({
      path: "/antidirt", // 后端服务实际的调用路径
      init: {
        method: "POST",
        header: {
          "content-type": "application/json",
        },
        body: {
          tasks: [
            {
              content: this.data.text,
            },
          ],
        },
        timeout: 60000, //ms
      },
      success: ({ statusCode, data }) => {
        tt.hideLoading();
        console.log("/antidirt success", data);
        const parsedData = parseJson(data);
        if (statusCode !== 200) {
          return toastError(statusCode, parsedData.message);
        }

        if (parsedData.code && parsedData.code !== 0) {
          return tt.showToast({
            icon: "none",
            title: parsedData.message,
          });
        }

        this.setData({
          haveGetTextAntidirt: true,
          hit: parsedData.data[0].predicts[0].hit,
        });
      },
      fail: (response) => {
        tt.hideLoading();
        console.warn("/antidirt fail", response);
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

  clearTextAntidirt() {
    this.setData({
      haveGetTextAntidirt: false,
      text: "",
    });
  },

  uploadImg() {
    console.log("uploadImg isLogin", isLogin);
    if (!isLogin) {
      return tt.showToast({
        icon: "none",
        title: "上传文件前,请先登录",
      });
    }

    tt.showLoading({
      title: " ",
    });
    // 让用户选择一张图片
    tt.chooseImage({
      count: 1,
      success: (res) => {
        const cloudPath = `my-photon-${Date.now()}.png`;
        // 将图片上传至云存储空间
        cloud.uploadFile({
          // 指定上传到的云路径
          cloudPath: cloudPath,
          filePath: res.tempFilePaths[0],
          timeout: 80000,
          success: (uploadRes) => {
            tt.hideLoading();
            console.log("Cloud.uploadFile success", uploadRes);
            this.setData({
              imgSrc: res.tempFilePaths[0],
              filePath: cloudPath,
              haveGetImgSrc: true,
            });
          },
          fail: (uploadRes) => {
            tt.hideLoading();
            console.log("Cloud.uploadFile fail", uploadRes);
            const errMsg =
              uploadRes.errMsg
                .split("Cloud.uploadFile:fail")[1]
                .split(",")[0] || uploadRes.errMsg;

            if (uploadRes.errMsg.includes("invalid session")) {
              return tt.showToast({
                icon: "none",
                title: "上传图片失败，请先登录",
              });
            }
            tt.showToast({
              icon: "none",
              title: errMsg,
            });
          },
        });
        console.log("tt.chooseImage success", res);
      },
      fail: (res) => {
        console.log("tt.chooseImage fail", res);
        const errMsg = res.errMsg.split("chooseImage:fail")[1] || res.errMsg;
        // 隐私协议中未定义相关隐私信息类型，详见配置隐私协议 https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/basic-capacities/privacy-agreement
        if (res.errNo === 10202) {
          return tt.showToast({
            icon: "none",
            title: "上传失败，请先配置隐私协议",
          });
        }
        tt.showToast({
          icon: "none",
          title: errMsg,
        });
      },
    });
  },

  clearImgSrc() {
    this.setData({
      haveGetImgSrc: false,
      imgSrc: "",
    });
  },

  getRecord() {
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
          haveGetRecord: true,
          record: parsedData.data.data,
        });
      },
      fail: (response) => {
        tt.hideLoading();
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

  clearRecord() {
    this.setData({
      haveGetRecord: false,
      record: "",
    });
  },
});
