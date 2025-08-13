const { getConfig } = require('./config/config');

App({
  onLaunch: async function () {
    const { envID, serviceID } = getConfig();
    const cloud = tt.createCloud({ envID, serviceID });

    // 提前初始化 globalData，避免页面过早读取时 cloud 为 undefined
    this.globalData = {
      cloud,
      isLogin: false,
      tempRecommend: [], // 临时存放推荐结果
    };

    try {
      await this.handleCheckSession();
      this.globalData.isLogin = true;
    } catch (err) {
      console.log(`session 已过期，需要重新登录`, err);
      const res = await this.handleLogin();
      this.globalData.isLogin = !!res.isLogin;
    }
  },

  handleLogin() {
    return new Promise((resolve) => {
      return tt.login({
        success: (res) => {
          console.log("login success", res);
          resolve(res);
        },
        fail: (err) => {
          console.log("login err", err);
          resolve({
            isLogin: false,
            errMsg: err.errMsg,
          });
        },
      });
    });
  },

  handleCheckSession() {
    return new Promise((resolve, reject) => {
      return tt.checkSession({
        success: (res) => {
          console.log("checkSession success", res);
          resolve(res);
        },
        fail: (err) => {
          console.log("checkSession fail", err);
          reject(err);
        },
      });
    });
  },
});
