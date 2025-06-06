const { contextBridge, ipcRenderer } = require('electron');

// 벤더 데이터 요청
contextBridge.exposeInMainWorld('api', {
  fetchBrandContactData: (filters) => ipcRenderer.invoke('brand-contact-data-request', filters),
  fetchBrandPhoneData: (brandName) => ipcRenderer.invoke('brand-phone-data-request', brandName),
  fetchLatestCallRecordByCardId: (cardId) => ipcRenderer.invoke('latest-call-record-request', cardId),
  fetchCallRecordById: (recordId) => ipcRenderer.invoke('call-record-by-id-request', recordId),
  updateBrandInfo: (brandName, updateData) => ipcRenderer.invoke('update-brand-info-request', brandName, updateData),
  saveCallRecord: (callRecord) => ipcRenderer.invoke('save-call-record-request', callRecord),
  updateCardNextStep: (recordId, newNextStep) => ipcRenderer.invoke('update-card-next-step-request', recordId, newNextStep),
  updateCallRecord: (recordId, updateData) => ipcRenderer.invoke('update-call-record-request', recordId, updateData),
  fetchCallRecords: (brandName) => ipcRenderer.invoke('fetch-call-records-request', brandName),
  callPhone: (phoneNumber) => ipcRenderer.invoke('call-phone-request', phoneNumber),
  endCall: () => ipcRenderer.invoke('end-call-request'),
  fetchProposalRequests: () => ipcRenderer.invoke('dashboard-proposal-request'),
  fetchBrandEmail: (brandName) => ipcRenderer.invoke('fetch-brand-email-request', brandName),
  updateNextStep: (brandName, newStatus) => ipcRenderer.invoke('update-nextstep-request', brandName, newStatus),
  fetchInfluencerDataForSellerMatch: () => ipcRenderer.invoke('fetch-influencer-data-for-seller-match'),
  fetchInfluencerDataForSellerAnalysis: () => ipcRenderer.invoke('fetch-influencer-data-for-seller-analysis'),
  getInfluencerInfo: (username) => ipcRenderer.invoke('get-influencer-info', username),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  saveInfluencerTags: (username, tags) => ipcRenderer.invoke('save-influencer-tags', { username, tags }),
  saveInfluencerContact: (username, method, info, excluded, reason) => ipcRenderer.invoke('save-influencer-contact', { username, method, info, excluded, reason }),
  fetchScreeningData: () => ipcRenderer.invoke('fetch-screening-data'),
  fetchInfluencerData: (cleanName) => ipcRenderer.invoke('fetch-influencer-data', cleanName),
  fetchItemDetails: (brandName, itemName) => ipcRenderer.invoke('fetch-item-details', { brandName, itemName }),
  fetchInfluencerViews: (cleanNameList) => ipcRenderer.invoke('fetch-influencer-views', cleanNameList),
  updateBrandVerification: (brandName, verificationStatus) => ipcRenderer.invoke('update-brand-verification', { brandName, verificationStatus }),
  fetchInfluencerDataMany: (cleanNameList) => ipcRenderer.invoke('fetch-influencer-data-many', cleanNameList),
  fetchBrandVerificationStatus: (allBrands) => ipcRenderer.invoke('fetch-brand-verification-status', allBrands),
  getDmRecords : (cleanName) => ipcRenderer.invoke('get-dm-records', cleanName),
  sendMailWithSMTP: (accountId, mailOptions) => ipcRenderer.invoke('send-mail-with-smtp', { accountId, mailOptions }),
  readExcelFile: (filePath) => ipcRenderer.invoke('read-excel-file', filePath),
  updateInfluencerName: (username, newName) => ipcRenderer.invoke('update-influencer-name', { username, newName }),
  updateInfluencerRookieStatus: (username, isRookie) => ipcRenderer.invoke('update-influencer-rookie-status', { username, isRookie }),
  saveInfluencerMemo: (username, memo) => ipcRenderer.invoke('save-influencer-memo', username, memo),
  getKeyword500Categories: () => ipcRenderer.invoke('get-keyword500-categories'),
  getKeyword500Keywords: (categoryId) => ipcRenderer.invoke('get-keyword500-keywords', categoryId),
  getKeyword500PickedKeywords: (categoryId) => ipcRenderer.invoke('get-keyword500-picked-keywords', categoryId),
  saveKeyword500Pick: (categoryId, keyword, searchVolume) => ipcRenderer.invoke('save-keyword500-pick', { categoryId, keyword, searchVolume }),
  removeKeyword500Pick: (categoryId, keyword) => ipcRenderer.invoke('remove-keyword500-pick', { categoryId, keyword }),
  updateKeyword500Status: (data) => ipcRenderer.invoke('update-keyword500-status', data),
  getBrandWebsiteUrl: (brandName) => ipcRenderer.invoke('get-brand-website-url', brandName),
  openNewWindow: (pagePath) => ipcRenderer.invoke('open-new-window', pagePath),
  createBrandInfo: (brandData) => ipcRenderer.invoke('create-brand-info', brandData)
});

contextBridge.exposeInMainWorld('googleSheetApi', {
  uploadInfluencerData: (uploadPayload) => ipcRenderer.invoke('upload-influencer-data', uploadPayload),
  refreshToken: () => ipcRenderer.invoke('refresh-google-token'),
  startAuth: () => ipcRenderer.invoke('start-google-auth'),
  handleAuthCode: (code) => ipcRenderer.invoke('handle-google-auth-code', code)
});

contextBridge.exposeInMainWorld('gmailAuthAPI', {
  startAuth: (accountId, credentialsPath) => ipcRenderer.invoke('start-gmail-auth', { accountId, credentialsPath }),
  sendAuthCode: (code) => ipcRenderer.invoke('send-auth-code', code),
  sendGmail: (params) => ipcRenderer.invoke('send-gmail', params)
});

// 쿠팡 검색 API 추가
contextBridge.exposeInMainWorld('coupangAPI', {
    search: (query) => ipcRenderer.invoke('search-coupang', query),
    getTrend: (keyword) => ipcRenderer.invoke('get-naver-trend', keyword),
    getKeywordStats: (keyword) => ipcRenderer.invoke('get-naver-keyword-stats', keyword)
});

contextBridge.exposeInMainWorld('notionAPI', {
    uploadToNotion: (data) => ipcRenderer.invoke('notion-upload', data)
});