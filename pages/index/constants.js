/**
 * 快速开始教程知识点
 */
const QuickStartPoints = [
  {
    id: "1",
    title: "如何部署后端服务",
  },
  {
    id: "2",
    title: "小程序端如何调用后端服务",
  },
  {
    id: "3",
    title: "如何从云数据库中读取数据",
  },
  {
    id: "4",
    title: "如何免鉴权调用抖音开放平台OpenApi",
  },
];

function markText(content) {
  return `<span style='padding: 0 2px; margin: 0 3px; border: 1px solid #dee0e3; border-radius: 3px; background-color: #f5f6f7'>${content}</span>`;
}

/**
 * 快速开始教程步骤
 */
const QuickStartSteps = [
  {
    id: "1",
    title: "如何部署后端服务",
    contents: [
      {
        type: "point",
        title: "抖音云支持如下两种部署模式",
        content: [
          {
            id: "1",
            title: `面向前端开发者的 Node.js函数服务，支持在线开发、调试、发布。`,
            linkText: "云函数开发指南",
            link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/guide/cloud-function-service-manage/cloud-function-guide",
          },
          {
            id: "2",
            title: `面向后端开发者的容器服务，支持任意语言和框架。`,
            linkText: "快速部署服务",
            link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/quick-start/quick-start-deploy",
          },
        ],
      },
      {
        type: "text",
        content: `下面以 Node.js函数服务为演示示例。<span style='color: red'>函数服务目前处于白名单开放中，可点击进行申请</span>`,
      },
      {
        type: "image",
        content: "nodejs-function.png",
      },
      {
        type: "text",
        content: `点击开发者工具顶部导航栏右侧的「抖音云」按钮跳转到抖音云控制台，点击「新建服务-通过模板一键部署」，在业务接入中提供了JavaScript、Typescript 2个函数模板示例，部署成功后支持2 种调用方式： 小程序SDK、域名调用。`,
      },
      {
        type: "image",
        content: "quick-deploy.png",
      },
      {
        type: "text",
        content:
          "部署完成后可前往「服务列表-服务详情页-函数列表」，支持函数服务的在线编辑、调试、发布。",
      },
      {
        type: "banner",
        content:
          "首次开通的抖音云时会发放180元云服务体验代金券（30天有效），同一企业主体下仅限发放一次。",
      },
      {
        type: "text",
        content: `点击 ${markText(
          "get_open_id.js"
        )}文件修改如下，接口返回请求的上下文信息。可点击「调试」按钮查看效果。`,
      },
      {
        type: "code",
        content: `
const { dySDK } = require("@open-dy/node-server-sdk");

module.exports = async function (params, context) {
  const serviceContext = dySDK.context(context);
  const reqContext = serviceContext.getContext();
  context.log("openId", reqContext?.openId);
  return {
    code: 0,
    message: "",
    data: reqContext?.openId,
  };
};
          `,
      },
      {
        type: "image",
        content: "cloud-function.png",
      },
    ],
  },
  {
    id: "2",
    title: "小程序端如何调用后端服务",
    contents: [
      {
        type: "text",
        content: `后端服务部署后，小程序端即可通过抖音云SDK进行调用，如下为示例代码，需要替换2个参数：envID、serviceID。详情见`,
        linkText: "小程序/小游戏/小玩法调用抖音云托管服务",
        link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/develop-guide/invoke-sever/cloud-sdk",
      },
      {
        type: "code",
        content: `
const cloud=tt.createCloud({
   envID:'env-xxx', // 抖音云环境 ID
    serviceID:'xxxxx' // 抖音云服务 ID
});
cloud.callContainer({
    path:'/quick_start',  // 后端服务实际的调用路径
    init:{
        method:'POST',
        header:{
            'content-type': 'application/json',
        },
        body:{
            example:'example',
        },
        timeout: 60000,//ms
    },
    success:({statusCode, header, data})=>{
        JSON.parse(data)
    },
    fail: console.warn,
    complete: console.warn,
})
          `,
      },
      {
        type: "text",
        content: `以函数服务为例，可点击编辑器右上角的「如何调用」侧拉出弹窗查看调用的信息。可修改小程序工程中的${markText(
          "app.js"
        )} 文件将${markText("tt.createCloud")}替换为实际后端服务的参数。`,
      },
      {
        type: "image",
        content: "cloud-call.png",
      },
      {
        type: "text",
        content: `注：抖音开发者工具内调用视为调试流量，如需真机访问，请前往「服务详情页-访问控制」，添加授权外网访问路径 ，详情见：`,
        linkText: "外网流量",
        link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/guide/server-manage/access-control/public-network",
      },
      {
        type: "image",
        content: "access-control.png",
      },
      {
        type: "text",
        content: "点击以下按钮查看调用结果。",
      },
    ],
    showJumpButton: true,
    showJumpPageType: "getOpenId",
  },
  {
    id: "3",
    title: "从云数据库中读取数据",
    contents: [
      {
        type: "text",
        content:
          "实际开发中,我们需要利用数据库实现持久存储,下面我们来通过云数据库实现这个效果。",
      },
      {
        type: "text",
        content:
          "点击开发者工具顶部的【抖音云】跳转到抖音云控制台,前往【组件中心-文档型数据库-云数据库】页面开通云数据库。",
      },
      {
        type: "text",
        content: `<span style='color: red'>目前云数据库处于白名单开放，可在控制台内提交申请</span>`,
      },
      {
        type: "image",
        content: "cloud-db.png",
      },
      {
        type: "image",
        content: "apply-cloud-db.png",
      },
      {
        type: "text",
        content: `在云数据库新建一个集合 ${markText(
          "demo"
        )}，并添加若干条记录。`,
      },
      {
        type: "image",
        content: "collection-todos.png",
      },
      {
        type: "text",
        content: `修改函数服务中的 ${markText(
          "select_record.js"
        )} 文件为如下代码，并进行发布。`,
        linkText: "服务端如何使用云数据库SDK",
        link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/develop-guide/cloud-database/server/guide",
      },
      {
        type: "code",
        content: `
const { dySDK } = require("@open-dy/node-server-sdk");

module.exports = async function (params, context) {
  try {
    const database = dySDK.database();
    const demo = await database
      .collection("demo")
      .aggregate()
      .sort({ serverDate: -1 })
      .limit(5)
      .end();
    return {
      data: demo,
      code: 0,
      message: "",
    };
  } catch (err) {
    return {
      data: [],
      code: 1,
      message: "云数据库查询失败，请确认云数据库是否开通和创建demo集合",
    };
  }
};
          `,
      },
      {
        type: "text",
        content: `点击查看调用结果，即可看到云数据库内的数据。`,
      },
    ],
    extra: [
      {
        type: "text",
        content: `云数据库不仅支持服务端 SDK 读写，也有面向小程序端的`,
        linkText: "云数据库SDK",
        link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/develop-guide/cloud-database/client/guide",
        extra:
          "，小程序端的权限需要在云数据库中进行配置，默认仅创建者可以读写。",
      },
      {
        type: "image",
        content: "cloud-db-permission.png",
      },
    ],
    showJumpButton: true,
    showJumpPageType: "selectRecord",
  },
  {
    id: "4",
    title: "调用抖音开放平台OpenApi",
    contents: [
      {
        type: "text",
        content:
          "小程序中如果有用户输入的文本，需要检测是否包含违法违规内容。",
      },
      {
        type: "text",
        content: "下面我们利用免鉴权的云调用能力调用平台的「",
        linkText: "内容安全检测",
        link:"https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/content-security/content-security-detect",
        extra:"」。"
      },
    
      {
        type: "text",
        content: `编辑函数服务中的文件 ${markText(
          "antidirt.js"
        )}，用以下代码覆盖文件内容。该接口用于生成小程序码图片。`,
      },
      {
        type: "code",
        content: `
const { dySDK } = require("@open-dy/node-server-sdk");

module.exports = async function (params, context) {
  const serviceContext = dySDK.context(context);
  const res = await serviceContext.openApiInvoke({
    // 替换为云调用内网专线域名
    url: "http://​developer-toutiao-com.openapi.dyc.ivolces.com/api/v2/tags/text/antidirt",
    method: "POST",
    data: params
  })

  return res;
};
          `,
      },
      {
        type: "text",
        content: "点击查看调用结果，即可看到调用结果。",
      },
    ],
    showJumpButton: true,
    showJumpPageType: "getTextAntidirt",
  },
  {
    id: "5",
    title: "发布到 prod 生产环境",
    contents: [
      {
        type: "text",
        content:
          "抖音云提供了2 套环境：dev开发环境、prod生产环境，两套环境资源完全隔离。",
      },
      {
        type: "text",
        content: `在dev开发环境完成开发后，需部署到prod生产环境以供线上调用。`,
      },
      {
        type: "point",
        content: [
          {
            id: "1",
            title: "后端服务更新",
          },
        ],
      },
      {
        type: "point2",
        content: [
          {
            id: "1",
            title: "存储组件等请在 prod 生产环境再次开通与配置",
          },
          {
            id: "2",
            title:
              "发布prod环境的后端服务，仅支持选择已部署到dev开发环境的版本",
          },
        ],
      },

      {
        type: "image",
        content: "function-deploy.png",
      },
      {
        type: "point",
        content: [
          {
            id: "1",
            title: `前端代码更新`,
          },
        ],
      },
      {
        type: "point2",
        content: [
          {
            id: "1",
            title: "线上版本请使用 prod 生产环境的 envID、serviceID",
          },
        ],
      },
    ],
  },
];

module.exports = {
  QuickStartPoints,
  QuickStartSteps,
};
