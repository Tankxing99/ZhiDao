// 抖音小程序前端环境配置（dev/prod）
// 注意：填写你自己的抖音云 envID 与 serviceID

const CONFIG = {
  dev: {
    envID: 'env-xvRarQd59a',
    serviceID: '1l8oey7uc6ql7',
    API_BASE: '', // 若开启自定义域名，则填写 https://your-domain
    CDN_BASE: '',
    ANALYTICS_ENABLED: false,
  },
  prod: {
    envID: '',
    serviceID: '',
    API_BASE: '',
    CDN_BASE: '',
    ANALYTICS_ENABLED: true,
  },
};

function getConfig() {
  // 简单通过编译时常量或运行时判断切环境，当前默认 dev
  const env = 'dev';
  return CONFIG[env];
}

module.exports = {
  getConfig,
};

