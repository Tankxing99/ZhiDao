// 通用交易系统测试页（P0：仅演示顺序与埋点，结合官方示例；不臆测任何字段定义）
// 参考文档：通用交易系统 接入指引（basicapi）
// https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/open-capacity/business-monetization/guaranteed-payment/general/basicapi

const { getConfig } = require('../../config/config');

Page({
  data:{ log: '', lastOrderId: '' },
  append(msg){ this.setData({ log: (this.data.log + (this.data.log? '\n' : '') + msg) }); },

  onLoad(){
    this.append('提示：本页包含官方示例的 requestOrder/getOrderPayment 调用按钮。所有参数请以你服务端返回的真实值替换，避免臆测。');
  },

  // 演示调用顺序（不传伪参数）
  async onDemo(){
    try{
      if (typeof tt.requestOrder !== 'function' || typeof tt.getOrderPayment !== 'function'){
        this.append('当前基础库暂不支持通用交易系统 JSAPI，请升级后重试。');
        return;
      }
      this.append('Step1: 准备官方所需参数 → 调用 tt.requestOrder(params)');
      this.append('Step2: 成功返回后 → 调用 tt.getOrderPayment(payParams)');
      this.append('注意：具体字段名与值严格以官方文档为准，且可能因产品线不同而差异。');
      tt.showToast({ icon:'none', title:'已输出调用顺序到页面与控制台' });
      console.log('[general-pay] 调用顺序示意：tt.requestOrder → tt.getOrderPayment');
    }catch(e){
      this.append('演示失败：' + (e?.message || String(e)));
    }
  },

  // 官方示例：创建订单（请将示例中的字段与授权替换为服务端返回的真实值）
  async createOrder(){
    try{
      console.log('[general-pay] createOrder tapped');
      this.append('开始创建订单…');
      const { API_BASE } = getConfig();
      const payload = {
        orderEntrySchema: { path: 'pages/index/index', params: '{"id":1234, "name":"hello"}' },
        skuList: [{ tagGroupId: 'test', skuId: 'abcd', title: 'test', price: 1, imageList: ['https://example.com/test.png'], type: 101, quantity: 1 }],
        outOrderNo: `out_order_test_${Date.now()}`,
        totalAmount: 1,
        payExpireSeconds: 300,
        limitPayWayList: []
      };

      // 使用 callback 版本，避免 await 在某些基础库不可用
      tt.request({
        url: `${API_BASE}/api/shop/general/requestOrder`,
        method: 'POST',
        data: payload,
        header: { 'content-type': 'application/json' },
        success: (resp) => {
          try{
            console.log('[general-pay] backend resp', resp);
            const r = resp && resp.data || {};
            if (!r || r.ok !== true || !r.data || !r.byteAuthorization) {
              this.append('后端未返回可用 data/byteAuthorization，hint=' + (r && (r.hint || r.message) || ''));
              tt.showToast({ icon:'none', title:'后端未就绪' });
              return;
            }
            // 调用官方 API：tt.requestOrder
            tt.requestOrder({
              data: r.data,
              byteAuthorization: r.byteAuthorization,
              success: (res) => {
                const { orderId } = res || {};
                console.log('requestOrder success, orderId =', orderId);
                this.setData({ lastOrderId: orderId || '' });
                this.append('requestOrder success, orderId=' + (orderId || ''));
              },
              fail: (res) => {
                const { errLogId, errMsg, errNo } = res || {};
                console.log('requestOrder fail', errNo, errMsg, errLogId);
                this.append('requestOrder fail: ' + JSON.stringify({ errNo, errMsg, errLogId }));
                tt.showToast({ icon:'none', title: '创建订单失败' });
              }
            });
          }catch(err){
            console.error('[general-pay] parse backend resp error', err);
            this.append('解析后端响应异常：' + (err?.message || String(err)));
          }
        },
        fail: (err) => {
          console.error('[general-pay] request to backend failed', err);
          this.append('请求后端失败：' + (err?.errMsg || JSON.stringify(err)));
          // 域名未加白常见错误提示
          if (err && /domain|not in domain|url/.test(err.errMsg || '')){
            this.append('可能原因：请求域名未加入“request 合法域名”。开发阶段可在 IDE 勾选不校验域名，或到平台配置 api.iotvision.top');
          }
          tt.showToast({ icon:'none', title:'请求后端失败' });
        }
      });
    }catch(e){
      console.error('[general-pay] createOrder exception', e);
      this.append('createOrder 调用异常：' + (e?.message || String(e)));
      tt.showToast({ icon:'fail', title:'异常，请看日志' });
    }
  },

  // 官方示例：拉起支付（将 orderId 替换为上一步成功返回的 orderId）
  pay(){
    const orderId = this.data.lastOrderId;
    if (!orderId){
      tt.showToast({ icon: 'none', title: '请先创建订单' });
      this.append('请先点击“创建订单”并成功返回 orderId 后再拉起支付');
      console.warn('[general-pay] pay tapped without orderId');
      return;
    }
    tt.getOrderPayment({
      orderId,
      success: (res) => {
        console.log('支付成功', res);
        tt.showToast({ icon: 'success', title: '支付成功' });
        this.append('getOrderPayment success');
      },
      fail: (res) => {
        console.error('支付失败', res);
        const { errNo, errMsg } = res || {};
        tt.showToast({ icon: 'fail', title: '支付失败' });
        this.append('getOrderPayment fail: ' + JSON.stringify({ errNo, errMsg }));
      }
    });
  },

  // 查询兜底演示：调用我们提供的 confirm 端点
  async onCheckOrder(){
    try{
      const orderNo = Date.now().toString(); // 仅演示；真实场景请使用业务侧的订单号
      const app = getApp();
      const cloud = app.globalData && app.globalData.cloud;
      const { data, statusCode } = await cloud.callContainer({ path: `/api/shop/orders/${orderNo}/confirm`, init: { method:'GET' } });
      this.append('confirm 响应：' + (typeof data === 'string' ? data : JSON.stringify(data)) + ' status=' + statusCode);
    }catch(e){ this.append('confirm 调用异常：' + (e?.message || String(e))); }
  }
});
