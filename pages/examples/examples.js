Page({
  data: {
    powerList: [{
        title: "函数服务",
        tip: "支持在线编辑、调试、发布",
        showItem: false,
        item: [{
            type: "getOpenId",
            title: "免登录获取OpenID",
          },
          {
            type: "getTextAntidirt",
            title: "免鉴权检测内容安全",
          },
        ],
      },
      {
        title: "云数据库",
        tip: "安全稳定的文档型数据库",
        showItem: false,
        item: [{
            title: '插入记录',
            page: 'updateRecord',
            category: "insertRecord"
          },
          {
            type: "selectRecord",
            title: "查询记录",
          },
          {
            title: '更新记录',
            page: 'updateRecord',
            category: "updateRecord"
          },
        ],
      },
      {
        title: "对象存储",
        tip: "支持配置CDN加速文件存储",
        showItem: false,
        item: [{
          type: "uploadFile",
          title: "上传文件",
        }, ],
      },
      {
        title: "容器服务",
        tip: "不限语言的全托管容器服务",
        link: "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/quick-start/quick-start-deploy",
      },
    ],
  },
  onLoad: function (options) {},

  copyLink(link) {
    tt.setClipboardData({
      data: link,
      success: (res) => {
        tt.showToast({
          icon: "none",
          title: '已复制链接，请在浏览器中打开',
        })
      },
      fail: (err) => {
        console.error('复制失败-----', err);
        if (err.errNo === 10202) {
          return tt.showToast({
            icon: "none",
            title: "复制失败，请先配置隐私协议",
          });
        }
        tt.showToast({
          icon: "fail",
          title: '复制失败',
        })
      }
    })
  },
  onClickPowerInfo(e) {
    const index = e.currentTarget.dataset.index;
    const powerList = this.data.powerList;
    const selectedItem = powerList[index];
    selectedItem.showItem = !selectedItem.showItem;
    if (selectedItem.link) {
      this.copyLink(selectedItem.link)
    } else if (selectedItem.type) {
      tt.navigateTo({
        url: `/pages/exampleDetail/exampleDetail?type=${selectedItem.type}`,
      });
    } else if (selectedItem.page) {
      tt.navigateTo({
        url: `/pages/${selectedItem.page}/${selectedItem.page}?category=${selectedItem.category}`,
      });
    } else {
      this.setData({
        powerList,
      });
    }
  },

  jumpPage(e) {
    const {
      type,
      page,
      category
    } = e.currentTarget.dataset;
    if (type) {
      tt.navigateTo({
        url: `/pages/exampleDetail/exampleDetail?type=${type}`,
      });
    } else {
      tt.navigateTo({
        url: `/pages/${page}/${page}?category=${category}`,
      });
    }
  },

});