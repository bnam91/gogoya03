import { commonUtils } from './utils/commonUtils.js';
import { renderMenu } from './utils/renderMenu.js';
import { renderPage } from './utils/renderPage.js';

/**
 * main.js
 * @fileoverview 앱 메인 엔트리 포인트, 렌더링 메뉴 및 페이지 렌더링
 */
window.onload = () => {
    renderMenu();
    commonUtils.menuToggle();
    commonUtils.initPage(renderPage); // 클릭 이벤트에 renderPage 연결

    // URL 파라미터에서 페이지 경로 가져오기
    const params = new URLSearchParams(window.location.search);
    const pagePath = params.get('page');
    
    // 페이지 경로가 있으면 해당 페이지를, 없으면 홈페이지를 렌더링
    renderPage(pagePath || 'tab1/home');
};