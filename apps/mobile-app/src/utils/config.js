export function getApiBase() { let url = uni.getStorageSync('api_base_url'); if (!url) { url = 'http://47.99.147.106:3015/api'; uni.setStorageSync('api_base_url', url); } return url; }
export function setApiBase(url) { uni.setStorageSync('api_base_url', url); }
