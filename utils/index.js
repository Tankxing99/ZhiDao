function parseJson(input) {
    try {
        // 兼容抖音云 callContainer 在不同 IDE/端返回 data 可能是 string 或 object
        if (typeof input === 'string') {
            return JSON.parse(input);
        }
        if (input && typeof input === 'object') {
            return input; // 已是对象则原样返回
        }
        return null; // 其他类型按失败处理
    } catch (error) {
        console.error("解析错误:", error.message);
        return null; // 返回 null 表示解析失败
    }
}


function toastError(code, message) {
    if (code === 404) {
        return tt.showToast({
            icon: "none",
            title: "路径不存在，请检查",
        });
    }
    if (code === 500) {
        return tt.showToast({
            icon: "none",
            title: "服务器内部错误",
        });
    }
    return tt.showToast({
        icon: "none",
        title: message,
    })
}

module.exports = {
    parseJson,
    toastError
}