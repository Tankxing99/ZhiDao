Page({
  data: {
    category: ''

  },
  onLoad: function (options) {
    this.setData({
      category: options.category
    })

  },
  goBack() {
    tt.navigateBack({
      delta: 2
    });
  },
})