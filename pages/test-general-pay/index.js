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
      // 先向我们自建后端请求 data 与 byteAuthorization（官方要求：服务端生成并下发）
      const { API_BASE } = getConfig();
      const payload = {
        orderEntrySchema: { path: 'pages/index/index', params: '{"id":1234, "name":"hello"}' },
        skuList: [{ tagGroupId: 'test', skuId: 'abcd', title: 'test', price: 1, imageList: ['https://example.com/test.png'], type: 101, quantity: 1 }],
        outOrderNo: `out_order_test_${Date.now()}`,
        totalAmount: 1,
        payExpireSeconds: 300,
        limitPayWayList: []
      };
      const resp = await tt.request({
        url: `${API_BASE}/api/shop/general/requestOrder`,
        method: 'POST',
        data: payload,
        header: { 'content-type': 'application/json' }
      });
      const r = resp && resp.data || {};
      if (!r || r.ok !== true || !r.data || !r.byteAuthorization) {
        this.append('后端尚未返回可用 data/byteAuthorization，hint=' + (r && r.hint || r && r.message || ''));
        tt.showToast({ icon:'none', title:'后端未就绪，查看日志' });
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
    }catch(e){
      console.error('[general-pay] createOrder exception', e);
      this.append('createOrder 调用异常：' + (e?.message || String(e)));
      tt.showToast({ icon:'fail', title:'异常，请看日志' });
    }
  },

  // 官方示例：拉起支付（将 orderId 替换为上一步成功返回的 orderId）
  pay(){
    const orderId = this.data.lastOrderId || '123'; // 演示：无有效值时走占位 '123'
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
