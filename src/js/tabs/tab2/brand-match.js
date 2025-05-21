/**
 * brand-match.js
 * @fileoverview 브랜드 매칭 탭 초기화
 */

export function initPage() {
    console.log('브랜드 매칭 페이지가 초기화되었습니다.');
    
    // 패널 초기화
    const leftContent = document.getElementById('brand-match-left-content');
    const centerContent = document.getElementById('brand-match-center-content');
    const rightContent = document.getElementById('brand-match-right-content');

    // 각 패널 내용 비우기
    if (leftContent) {
        leftContent.innerHTML = '';
    }
    if (centerContent) {
        centerContent.innerHTML = '';
    }
    if (rightContent) {
        rightContent.innerHTML = '';
    }

    // 브레드크럼 업데이트
    const breadcrumbMain = document.getElementById('breadcrumb-main');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    
    if (breadcrumbMain) {
        breadcrumbMain.textContent = '벤더';
    }
    if (breadcrumbCurrent) {
        breadcrumbCurrent.textContent = '브랜드 매칭';
    }
} 