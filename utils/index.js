function parseJson(jsonString) {
    try {
        const parsedObject = JSON.parse(jsonString);
        return parsedObject;
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