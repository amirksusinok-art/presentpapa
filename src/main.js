import { GiftScene } from './three-scene.js';
import { soundCtrl } from './audio.js';
import { ScratchLottery } from './lottery.js';
import { BirthdayCake } from './cake.js';
import { CokaColaCan } from './cola.js';
import { CosmicRocketModule } from './rocket.js';
import { haptics } from './haptics.js';
import confetti from 'canvas-confetti';

// Fallback photos list
const DEFAULT_PHOTOS = [
  { id: 1, file: 'photos/photo-01.jpg', caption: 'Самые тёплые воспоминания', aspect: 0.75 },
  { id: 2, file: 'photos/photo-02.jpg', caption: 'Семейные улыбки и радость', aspect: 1.33 },
  { id: 3, file: 'photos/photo-03.jpg', caption: 'Моменты, согревающие душу', aspect: 0.75 },
  { id: 4, file: 'photos/photo-04.jpg', caption: 'Счастливые дни вместе', aspect: 0.75 },
  { id: 5, file: 'photos/photo-05.jpg', caption: 'Любимый папа рядом', aspect: 1.33 },
  { id: 6, file: 'photos/photo-06.jpg', caption: 'Наши путешествия и прогулки', aspect: 0.75 },
  { id: 7, file: 'photos/photo-07.jpg', caption: 'Уют и тепло родного дома', aspect: 1.33 },
  { id: 8, file: 'photos/photo-08.jpg', caption: 'Гордимся тобой каждый день', aspect: 0.75 },
  { id: 9, file: 'photos/photo-09.jpg', caption: 'Счастье в каждом кадре', aspect: 0.75 },
  { id: 10, file: 'photos/photo-10.jpg', caption: 'Твоя забота и поддержка', aspect: 0.75 },
  { id: 11, file: 'photos/photo-11.jpg', caption: 'Лучшие мгновения жизни', aspect: 0.75 },
  { id: 12, file: 'photos/photo-12.jpg', caption: 'Улыбка, дарящая свет', aspect: 0.75 },
  { id: 13, file: 'photos/photo-13.jpg', caption: 'Вместе сквозь года', aspect: 0.75 },
  { id: 14, file: 'photos/photo-14.jpg', caption: 'Бесценные моменты счастья', aspect: 1.33 },
  { id: 15, file: 'photos/avrora.mp4', poster: 'photos/avrora-poster.jpg', caption: 'Аврора: наше маленькое чудо ✨', type: 'video', aspect: 1.777 }
];

class App {
  constructor() {
    this.currentScreen = 'intro';
    this.photos = DEFAULT_PHOTOS;
    this.currentPhotoIdx = 0;
    this.giftScene = null;
    this.hasWebGL = false;
    this.lottery = null;
    this.cake = null;
    this.cola = null;
    this.rocket = null;

    // Screens
    this.screens = {
      intro: document.getElementById('screen-intro'),
      lottery: document.getElementById('screen-lottery'),
      greeting: document.getElementById('screen-greeting'),
      gallery: document.getElementById('screen-gallery'),
      cake: document.getElementById('screen-cake'),
      cola: document.getElementById('screen-cola'),
      rocket: document.getElementById('screen-rocket'),
      finale: document.getElementById('screen-finale')
    };

    this.canvasContainer = document.getElementById('canvas-container');
    this.cssFallback = document.getElementById('css-fallback');
    this.openingStatus = document.getElementById('opening-status');

    // Action buttons
    this.btnOpenGift = document.getElementById('btn-open-gift');
    this.btnViewPhotos = document.getElementById('btn-view-photos');
    this.btnFinishGallery = document.getElementById('btn-finish-gallery');
    this.btnBackToGreeting = document.getElementById('btn-back-to-greeting');
    this.btnBackToCake = document.getElementById('btn-back-to-cake');
    this.btnBackToCola = document.getElementById('btn-back-to-cola');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnBackToPhotos = document.getElementById('btn-back-to-photos');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundText = document.getElementById('sound-text');

    // Single-photo album elements
    this.albumCounter = document.getElementById('album-counter');
    this.albumPrev = document.getElementById('album-prev');
    this.albumNext = document.getElementById('album-next');
    this.photoViewerCard = document.getElementById('photo-viewer-card');
    this.viewerImg = document.getElementById('viewer-img');
    this.viewerVideo = document.getElementById('viewer-video');
    this.viewerSkeleton = document.getElementById('viewer-skeleton');
    this.photoCaption = document.getElementById('photo-caption');
    this.thumbsStrip = document.getElementById('thumbs-strip');

    // Lightbox Modal
    this.lightbox = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxVideo = document.getElementById('lightbox-video');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.lightboxCounter = document.getElementById('lightbox-counter');
    this.lightboxClose = document.getElementById('lightbox-close');
    this.lightboxPrev = document.getElementById('lightbox-prev');
    this.lightboxNext = document.getElementById('lightbox-next');

    // Touch gesture variables
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  async init() {
    this.init3DScene();
    this.initSoundEvents();
    this.initLotteryModule();
    this.initCakeModule();
    this.initColaModule();
    this.initRocketModule();
    this.initNavigation();
    this.initAlbumSlider();
    this.initLightbox();
    await this.loadPhotosData();
    this.setupAlbumView();
  }

  initLotteryModule() {
    if (this.screens.lottery) {
      this.lottery = new ScratchLottery(this.screens.lottery, () => {
        this.showScreen('greeting');
        this.scrollToTop();
      });
      this.lottery.init();
    }
  }

  initCakeModule() {
    if (this.screens.cake) {
      this.cake = new BirthdayCake(this.screens.cake, () => {
        this.showScreen('cola');
        this.scrollToTop();
      });
      this.cake.init();
    }
  }

  initColaModule() {
    if (this.screens.cola) {
      this.cola = new CokaColaCan(this.screens.cola, () => {
        this.showScreen('rocket');
        this.scrollToTop();
      });
      this.cola.init();
    }
  }

  initRocketModule() {
    if (this.screens.rocket) {
      this.rocket = new CosmicRocketModule(this.screens.rocket, () => {
        this.restartExperience();
        this.scrollToTop();
      });
      this.rocket.init();
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  }

  init3DScene() {
    this.giftScene = new GiftScene(this.canvasContainer);
    this.hasWebGL = this.giftScene.init();

    if (!this.hasWebGL) {
      console.warn('WebGL is unavailable. Falling back to CSS 3D Box.');
      this.canvasContainer.style.display = 'none';
      this.cssFallback.classList.add('active');
    }
  }

  initSoundEvents() {
    const unlockAudio = () => {
      soundCtrl.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    this.btnSoundToggle.addEventListener('click', () => {
      haptics.light();
      const isMuted = soundCtrl.toggleMute();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.soundText.textContent = isMuted ? 'Без звука' : 'Звук';
      this.btnSoundToggle.setAttribute(
        'aria-label',
        isMuted ? 'Включить звук' : 'Выключить звук'
      );
    });
  }

  initNavigation() {
    const triggerGiftOpen = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.startGiftOpening();
    };

    this.btnOpenGift.addEventListener('click', triggerGiftOpen);
    this.btnOpenGift.addEventListener('touchend', triggerGiftOpen, { passive: false });

    if (this.canvasContainer) {
      this.canvasContainer.addEventListener('click', () => {
        if (this.currentScreen === 'intro') {
          this.startGiftOpening();
        }
      });
      this.canvasContainer.addEventListener('touchend', () => {
        if (this.currentScreen === 'intro') {
          this.startGiftOpening();
        }
      });
    }

    if (this.screens.intro) {
      this.screens.intro.addEventListener('click', (e) => {
        if (e.target.closest('#btn-open-gift') || e.target.closest('.intro-header')) return;
        if (this.currentScreen === 'intro') {
          this.startGiftOpening();
        }
      });
    }

    this.btnViewPhotos.addEventListener('click', () => {
      haptics.medium();
      this.showScreen('gallery');
      this.scrollToTop();
    });

    this.btnFinishGallery.addEventListener('click', () => {
      haptics.medium();
      this.showScreen('cake');
      this.scrollToTop();
    });

    this.btnBackToGreeting.addEventListener('click', () => {
      haptics.medium();
      this.showScreen('greeting');
      this.scrollToTop();
    });

    if (this.btnBackToCola) {
      this.btnBackToCola.addEventListener('click', () => {
        haptics.medium();
        this.showScreen('cola');
        this.scrollToTop();
      });
    }

    if (this.btnBackToCake) {
      this.btnBackToCake.addEventListener('click', () => {
        haptics.medium();
        this.showScreen('cake');
        this.scrollToTop();
      });
    }

    this.btnBackToPhotos.addEventListener('click', () => {
      haptics.medium();
      this.showScreen('gallery');
      this.scrollToTop();
    });

    this.btnRestart.addEventListener('click', () => {
      haptics.medium();
      this.restartExperience();
      this.scrollToTop();
    });
  }

  showScreen(name) {
    this.currentScreen = name;

    Object.keys(this.screens).forEach(key => {
      if (this.screens[key]) {
        if (key === name) {
          this.screens[key].classList.add('active');
        } else {
          this.screens[key].classList.remove('active');
        }
      }
    });

    // Dim 3D scene when inside interactive lottery, photo album, cake, cola, rocket, or finale
    if (name === 'gallery' || name === 'finale' || name === 'lottery' || name === 'cake' || name === 'cola' || name === 'rocket') {
      this.canvasContainer.classList.add('dimmed');
    } else {
      this.canvasContainer.classList.remove('dimmed');
    }

    // Hide background gift canvas during rocket launch so rocket WebGL scene has full stage
    if (this.canvasContainer) {
      this.canvasContainer.style.display = (name === 'rocket') ? 'none' : 'block';
    }

    // Hide top bar during rocket launch so there's no overlapping text / sound button over rocket view
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      topBar.style.display = (name === 'rocket') ? 'none' : 'flex';
    }

    // Manage Three.js rendering loops to prevent background lag on mobile
    if (this.giftScene) {
      if (name === 'intro') {
        this.giftScene.resume();
      } else {
        this.giftScene.pause();
      }
    }

    if (this.rocket) {
      if (name === 'rocket') {
        this.rocket.startRendering();
        this.rocket.onWindowResize();
        requestAnimationFrame(() => {
          if (this.rocket) this.rocket.onWindowResize();
        });
      } else {
        this.rocket.stopRendering();
      }
    }

    // Pause video playback if navigating away from gallery
    if (name !== 'gallery') {
      if (this.viewerVideo) this.viewerVideo.pause();
      if (this.lightboxVideo) this.lightboxVideo.pause();
    }

    // Manage microphone / audio listening for Cake screen
    if (this.cake) {
      if (name === 'cake') {
        this.cake.startListening();
      } else {
        this.cake.stopListening();
      }
    }
  }

  startGiftOpening() {
    if (this._isOpeningGift) return;
    this._isOpeningGift = true;

    haptics.medium();

    // Gracefully fade out the button without intermediate loading delay
    this.btnOpenGift.style.opacity = '0';
    this.btnOpenGift.style.pointerEvents = 'none';
    if (this.openingStatus) {
      this.openingStatus.style.display = 'none';
    }

    // Festive golden confetti burst right when lid lifts up
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.58 },
          colors: ['#f5d78e', '#dcb355', '#ffffff', '#ba8c2d', '#ffe8a3'],
          disableForReducedMotion: true
        });
      } catch (e) {
        console.warn('Confetti launch error:', e);
      }
    }, 800);

    let completed = false;
    const finishOpen = () => {
      if (completed) return;
      completed = true;
      this._isOpeningGift = false;
      this.showScreen('lottery');
      this.scrollToTop();
      haptics.success();
    };

    // Safety fallback: if anything stalls or takes too long, never leave user stuck!
    const safetyTimer = setTimeout(finishOpen, 2400);

    if (this.hasWebGL && this.giftScene) {
      this.giftScene.openBox(() => {
        clearTimeout(safetyTimer);
        finishOpen();
      });
    } else {
      this.cssFallback.classList.add('opened');
      soundCtrl.playRibbonWhoosh();
      setTimeout(() => {
        soundCtrl.playBoxOpeningChime();
        soundCtrl.startAmbientMusic();
      }, 700);

      setTimeout(() => {
        clearTimeout(safetyTimer);
        finishOpen();
      }, 1800);
    }
  }

  restartExperience() {
    this._isOpeningGift = false;
    if (this.hasWebGL && this.giftScene) {
      this.giftScene.resetBox();
    } else {
      this.cssFallback.classList.remove('opened');
    }

    if (this.lottery) {
      this.lottery.reset();
    }

    if (this.cake) {
      this.cake.reset();
    }

    if (this.cola) {
      this.cola.reset();
    }

    if (this.rocket) {
      this.rocket.resetToStandby();
    }

    if (this.canvasContainer) {
      this.canvasContainer.style.display = 'block';
    }

    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      topBar.style.display = 'flex';
    }

    this.btnOpenGift.style.display = 'inline-flex';
    this.btnOpenGift.style.opacity = '1';
    this.btnOpenGift.style.pointerEvents = 'auto';
    this.btnOpenGift.classList.remove('opening-state');
    this.btnOpenGift.innerHTML = '<span>Открыть подарок</span> <span class="btn-sparkle" aria-hidden="true">✨</span>';
    if (this.openingStatus) {
      this.openingStatus.style.display = 'none';
    }
    this.currentPhotoIdx = 0;
    this.displayPhoto(0);
    this.showScreen('intro');
  }

  async loadPhotosData() {
    try {
      const res = await fetch('./photos.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.photos = data;
        }
      }
    } catch {
      // DEFAULT_PHOTOS fallback
    }
  }

  setupAlbumView() {
    // Generate mini-thumbnails
    this.thumbsStrip.innerHTML = '';
    this.photos.forEach((item, idx) => {
      const isVideo = item.type === 'video' || item.file.endsWith('.mp4');
      const thumb = document.createElement('div');
      thumb.className = `thumb-item ${idx === 0 ? 'active' : ''} ${isVideo ? 'is-video-thumb' : ''}`;
      thumb.setAttribute('role', 'tab');
      thumb.setAttribute('aria-label', `${isVideo ? 'Видео' : 'Фотография'} ${idx + 1}`);

      const img = document.createElement('img');
      img.src = item.poster || item.file;
      img.alt = `Миниатюра ${idx + 1}`;
      img.loading = 'lazy';
      thumb.appendChild(img);

      if (isVideo) {
        const badge = document.createElement('div');
        badge.className = 'thumb-video-badge';
        badge.textContent = '▶';
        badge.setAttribute('aria-hidden', 'true');
        thumb.appendChild(badge);
      }

      thumb.addEventListener('click', () => {
        this.displayPhoto(idx);
      });

      this.thumbsStrip.appendChild(thumb);
    });

    // Display initial photo
    this.displayPhoto(0);
  }

  displayPhoto(idx) {
    const prevIdx = this.currentPhotoIdx;
    this.currentPhotoIdx = (idx + this.photos.length) % this.photos.length;
    if (prevIdx !== this.currentPhotoIdx) {
      haptics.selection();
    }
    const item = this.photos[this.currentPhotoIdx];
    const isVideo = item.type === 'video' || item.file.endsWith('.mp4');

    // Pause any active playback
    if (this.viewerVideo) {
      this.viewerVideo.pause();
    }
    if (this.lightboxVideo) {
      this.lightboxVideo.pause();
    }

    // Show skeleton & fade out current
    this.viewerSkeleton.style.display = 'block';

    if (isVideo) {
      this.viewerImg.style.display = 'none';
      if (this.viewerVideo) {
        this.viewerVideo.style.display = 'block';
        this.viewerVideo.style.opacity = '0';
        this.viewerVideo.src = item.file;
        if (item.poster) {
          this.viewerVideo.poster = item.poster;
        }
        this.viewerVideo.onloadeddata = () => {
          this.viewerSkeleton.style.display = 'none';
          this.viewerVideo.style.opacity = '1';
        };
        this.viewerVideo.onerror = () => {
          this.viewerSkeleton.style.display = 'none';
          this.viewerVideo.style.opacity = '0.7';
        };
      }
    } else {
      if (this.viewerVideo) {
        this.viewerVideo.style.display = 'none';
      }
      this.viewerImg.style.display = 'block';
      this.viewerImg.style.opacity = '0';
      this.viewerImg.style.transform = 'scale(0.97)';

      this.viewerImg.src = item.file;
      this.viewerImg.onload = () => {
        this.viewerSkeleton.style.display = 'none';
        this.viewerImg.style.opacity = '1';
        this.viewerImg.style.transform = 'scale(1)';
      };

      this.viewerImg.onerror = () => {
        this.viewerSkeleton.style.display = 'none';
        this.viewerImg.style.opacity = '0.5';
      };
    }

    // Update counter & caption
    this.albumCounter.textContent = `${this.currentPhotoIdx + 1} из ${this.photos.length}`;
    if (this.photoCaption) {
      this.photoCaption.textContent = item.caption || `Фотография ${this.currentPhotoIdx + 1}`;
    }

    // Highlight thumbnail and scroll into view smoothly
    const thumbs = this.thumbsStrip.querySelectorAll('.thumb-item');
    thumbs.forEach((th, i) => {
      if (i === this.currentPhotoIdx) {
        th.classList.add('active');
        th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        th.classList.remove('active');
      }
    });
  }

  initAlbumSlider() {
    // Prev / Next button clicks
    this.albumPrev.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx - 1);
    });

    this.albumNext.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx + 1);
    });

    // Tap on photo card opens full-screen Lightbox (unless clicking video controls)
    this.photoViewerCard.addEventListener('click', (e) => {
      if (e.target === this.viewerVideo) return;
      this.openLightbox(this.currentPhotoIdx);
    });

    const tapHint = document.getElementById('viewer-tap-hint');
    if (tapHint) {
      tapHint.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openLightbox(this.currentPhotoIdx);
      });
    }

    this.photoViewerCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target === this.viewerVideo) return;
        e.preventDefault();
        this.openLightbox(this.currentPhotoIdx);
      }
    });

    // Touch swipe gestures on the photo card (Mobile ergonomics!)
    this.photoViewerCard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.photoViewerCard.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        // Swipe horizontal threshold 40px
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            // Swiped left -> next photo
            this.displayPhoto(this.currentPhotoIdx + 1);
          } else {
            // Swiped right -> prev photo
            this.displayPhoto(this.currentPhotoIdx - 1);
          }
        }
      }
    }, { passive: true });

    // Global keyboard arrows navigation
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'gallery' && !this.lightbox.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
          this.displayPhoto(this.currentPhotoIdx - 1);
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          if (e.target === this.viewerVideo) return;
          e.preventDefault();
          this.displayPhoto(this.currentPhotoIdx + 1);
        }
      }
    });
  }

  initLightbox() {
    this.lightboxClose.addEventListener('click', () => this.closeLightbox());
    this.lightboxPrev.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx - 1);
      this.updateLightboxContent();
    });
    this.lightboxNext.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx + 1);
      this.updateLightboxContent();
    });

    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') {
        this.closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        this.displayPhoto(this.currentPhotoIdx - 1);
        this.updateLightboxContent();
      } else if (e.key === 'ArrowRight') {
        this.displayPhoto(this.currentPhotoIdx + 1);
        this.updateLightboxContent();
      }
    });

    // Lightbox swipe gestures
    this.lightbox.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.lightbox.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            this.displayPhoto(this.currentPhotoIdx + 1);
            this.updateLightboxContent();
          } else {
            this.displayPhoto(this.currentPhotoIdx - 1);
            this.updateLightboxContent();
          }
        } else if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
          this.closeLightbox();
        }
      }
    }, { passive: true });
  }

  openLightbox(idx) {
    haptics.light();
    this.currentPhotoIdx = idx;
    this.updateLightboxContent();
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.lightboxClose.focus();
  }

  closeLightbox() {
    haptics.light();
    if (this.lightboxVideo) {
      this.lightboxVideo.pause();
    }
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  updateLightboxContent() {
    const item = this.photos[this.currentPhotoIdx];
    const isVideo = item.type === 'video' || item.file.endsWith('.mp4');

    if (this.viewerVideo) {
      this.viewerVideo.pause();
    }
    if (this.lightboxVideo) {
      this.lightboxVideo.pause();
    }

    if (isVideo) {
      this.lightboxImg.style.display = 'none';
      if (this.lightboxVideo) {
        this.lightboxVideo.style.display = 'block';
        this.lightboxVideo.src = item.file;
        if (item.poster) {
          this.lightboxVideo.poster = item.poster;
        }
        this.lightboxVideo.play().catch(() => {});
      }
    } else {
      if (this.lightboxVideo) {
        this.lightboxVideo.style.display = 'none';
      }
      this.lightboxImg.style.display = 'block';
      this.lightboxImg.style.opacity = '0';
      this.lightboxImg.src = item.file;
      this.lightboxImg.onload = () => {
        this.lightboxImg.style.opacity = '1';
      };
    }
    this.lightboxCounter.textContent = `${this.currentPhotoIdx + 1} / ${this.photos.length}`;
    if (this.lightboxCaption) {
      this.lightboxCaption.textContent = item.caption || `Фотография ${this.currentPhotoIdx + 1}`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
