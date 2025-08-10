const { getConfig } = require('./config/config');

App({
  onLaunch: async function () {
    const { envID, serviceID } = getConfig();
    const cloud = tt.createCloud({ envID, serviceID });

    let isLogin = false;
    try {
      await this.handleCheckSession();
      isLogin = true;
    } catch (err) {
      console.log(`session 已过期，需要重新登录`, err);
      const res = await this.handleLogin();
      isLogin = res.isLogin;
    }

    this.globalData = {
      cloud,
      isLogin,
      tempRecommend: [], // 临时存放推荐结果
    };
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
