(function(){
  if(!window.matchMedia('(min-width:801px)').matches)return;
  const dict={
    ua:{
      heroLocation:'ЛЬВІВ · УКРАЇНА',heroTitle:'Більше, ніж стрижка.<br>Це ваш стандарт.',heroText:'Чоловічі стрижки, оформлення бороди<br>та класичний барберинг у сучасному форматі.',
      barbersEyebrow:'BARBERS',barbersTitle:'Наші барбери',barbersKicker:'CROWN & BLADE TEAM',
      quality:'ЯКІСТЬ',qualityText:'Професійна косметика<br>та інструменти',atmosphere:'АТМОСФЕРА',atmosphereText:'Комфортний простір<br>для справжніх чоловіків',details:'ДЕТАЛІ',detailsText:'Увага до кожного<br>клієнта',style:'СТИЛЬ',styleText:'Допомагаємо підкреслити<br>індивідуальність',
      contactEyebrow:'КОНТАКТИ',contactTitle:'Зв’яжіться<br>з нами',contactText:'Маєте питання, хочете дізнатися більше або просто поспілкуватися? Ми завжди на зв’язку.',namePlaceholder:'Ваше ім’я',emailPlaceholder:'Email або телефон',messagePlaceholder:'Ваше повідомлення',send:'НАДІСЛАТИ ПОВІДОМЛЕННЯ',galleryEyebrow:'НАШІ РОБОТИ',galleryTitle:'Стиль у деталях',galleryButton:'ВІДКРИТИ ГАЛЕРЕЮ',
      commentsEyebrow:'ВІДГУКИ',commentsTitle:'Що кажуть наші клієнти',commentsKicker:'CROWN & BLADE CLIENTS',footerAbout:'ПРО НАС',footerGallery:'ГАЛЕРЕЯ',footerReviews:'ВІДГУКИ',footerContact:'КОНТАКТИ',footerCopy:'© 2026 Crown & Blade. Усі права захищені.',footerTagline:'Створено для справжніх чоловіків.',
      aboutEyebrow:'ПРО НАС',aboutTitle:'Більше, ніж<br>просто стрижка',aboutText:'Crown & Blade — це місце, де класичні традиції барберингу зустрічаються із сучасним стилем. Ми створюємо не просто стрижки, а впевненість, характер і ваш унікальний образ.',aboutPhilosophy:'НАША ФІЛОСОФІЯ',aboutPhilosophyTitle:'Стиль у деталях',aboutPhilosophyText:'Ми віримо, що кожна деталь має значення — від першого візиту до останнього штриха. У Crown & Blade ми створюємо простір, де ви можете відчути себе впевнено, відпочити і отримати більше, ніж просто стрижку.',back:'← НАЗАД ДО ГОЛОВНОЇ',card1:'ЯКІСТЬ',card1Text:'Професійна косметика<br>та інструменти',card2:'АТМОСФЕРА',card2Text:'Комфортний простір<br>для справжніх чоловіків',card3:'ДЕТАЛІ',card3Text:'Увага до кожного<br>клієнта',card4:'СТИЛЬ',card4Text:'Допомагаємо підкреслити<br>індивідуальність'
    },
    en:{
      heroLocation:'LVIV · UKRAINE',heroTitle:'More than a haircut.<br>It’s your standard.',heroText:'Men’s haircuts, beard grooming<br>and classic barbering in a modern format.',
      barbersEyebrow:'BARBERS',barbersTitle:'Meet our barbers',barbersKicker:'CROWN & BLADE TEAM',
      quality:'QUALITY',qualityText:'Professional grooming<br>products and tools',atmosphere:'ATMOSPHERE',atmosphereText:'A comfortable space<br>for modern men',details:'DETAILS',detailsText:'Attention to every<br>client',style:'STYLE',styleText:'We help emphasize<br>your individuality',
      contactEyebrow:'CONTACT',contactTitle:'Get in touch<br>with us',contactText:'Have a question, want to know more, or simply talk? We are always here for you.',namePlaceholder:'Your name',emailPlaceholder:'Email or phone',messagePlaceholder:'Your message',send:'SEND MESSAGE',galleryEyebrow:'OUR WORK',galleryTitle:'Style in detail',galleryButton:'OPEN GALLERY',
      commentsEyebrow:'REVIEWS',commentsTitle:'What our clients say',commentsKicker:'CROWN & BLADE CLIENTS',footerAbout:'ABOUT',footerGallery:'GALLERY',footerReviews:'REVIEWS',footerContact:'CONTACT',footerCopy:'© 2026 Crown & Blade. All rights reserved.',footerTagline:'Created for men who value their style.',
      aboutEyebrow:'ABOUT US',aboutTitle:'More than<br>just a haircut',aboutText:'Crown & Blade is a place where classic barbering traditions meet modern style. We create more than haircuts — confidence, character and your unique look.',aboutPhilosophy:'OUR PHILOSOPHY',aboutPhilosophyTitle:'Style in detail',aboutPhilosophyText:'We believe every detail matters — from the first visit to the final touch. At Crown & Blade, we create a space where you can feel confident, slow down and get more than just a haircut.',back:'← BACK TO HOME',card1:'QUALITY',card1Text:'Professional grooming<br>products and tools',card2:'ATMOSPHERE',card2Text:'A comfortable space<br>for modern men',card3:'DETAILS',card3Text:'Attention to every<br>client',card4:'STYLE',card4Text:'We help emphasize<br>your individuality'
    }
  };
  const getLang=()=>localStorage.getItem('cb-lang')||'ua';
  function apply(){
    const lang=getLang(),d=dict[lang]||dict.ua;
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-desktop-i18n]').forEach(el=>{
      const key=el.dataset.desktopI18n;if(d[key]!=null)el.textContent=d[key];
    });
    document.querySelectorAll('[data-desktop-i18n-html]').forEach(el=>{
      const key=el.dataset.desktopI18nHtml;if(d[key]!=null)el.innerHTML=d[key];
    });
    document.querySelectorAll('[data-desktop-i18n-placeholder]').forEach(el=>{
      const key=el.dataset.desktopI18nPlaceholder;if(d[key]!=null)el.placeholder=d[key];
    });
    document.querySelectorAll('.desktop-lang-switch').forEach(el=>{el.textContent=lang==='ua'?'EN':'UA';el.setAttribute('aria-label',lang==='ua'?'Switch to English':'Перемкнути на українську');});
    window.dispatchEvent(new Event('desktoplanguagechange'));
  }
  function toggle(){localStorage.setItem('cb-lang',getLang()==='ua'?'en':'ua');apply();}
  document.querySelectorAll('.desktop-lang-switch').forEach(btn=>btn.addEventListener('click',toggle));
  apply();
})();
