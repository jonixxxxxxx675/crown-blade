(function(){
  const DICT={
    ua:{
      navHome:'Головна',navServices:'Послуги',navReviews:'Відгуки',navContact:'Контакти',
      menuBook:'Записатися',menuAccount:'Мій акаунт',menuSupport:'Служба підтримки',
      heroTitle:'Більше, ніж стрижка.<br>Це ваш стандарт.',
      heroText:'Чоловічі стрижки, оформлення бороди<br>та класичний барберинг у сучасному форматі.',heroButton:'ЗАПИСАТИСЯ НА ВІЗИТ　→',
      chooseService:'Виберіть послугу',seeAll:'Дивитися все →',chooseBarber:'Виберіть барбера',chooseDate:'Виберіть дату',chooseTime:'Виберіть час',
      reviewsEyebrow:'ВІДГУКИ',reviewsTitle:'Відгуки клієнтів',servicesEyebrow:'ПОСЛУГИ',servicesTitle:'Наші послуги',servicesText:'Професійний догляд<br>для сучасних чоловіків.',viewServices:'ПЕРЕГЛЯНУТИ ВСІ ПОСЛУГИ　→',
      confirmBooking:'ПІДТВЕРДИТИ БРОНЮВАННЯ',bookingConfirmed:'Бронювання підтверджено',bookingConfirmedText:'Ваш запис успішно підтверджено.',done:'Готово',back:'Назад',contactEyebrow:'КОНТАКТИ',accountEyebrow:'АКАУНТ',supportEyebrow:'ПІДТРИМКА',contactTitle:'Зв’яжіться з нами',contactText:'Залиште email та повідомлення. Ми зв’яжемося з вами найближчим часом.',emailPlaceholder:'Ваш email',messagePlaceholder:'Ваше повідомлення',send:'ВІДПРАВИТИ →',accountTitle:'Створити акаунт',accountText:'Зареєструйте акаунт, щоб зберігати свої записи та швидше бронювати наступний візит.',namePlaceholder:'Ім’я',accountEmailPlaceholder:'Email',passwordPlaceholder:'Пароль',register:'ЗАРЕЄСТРУВАТИСЯ →',supportTitle:'Служба підтримки',supportText:'Якщо виникла проблема із записом або сайтом, напишіть нам.',supportQ1:'Проблема із записом?',supportA1:'Перевірте вибрану послугу, барбера, дату та час.',supportQ2:'Потрібна допомога?',supportA2:'Залиште повідомлення через сторінку контактів.',supportButton:'НАПИСАТИ В ПІДТРИМКУ →',
      service_classic:'Класична стрижка',service_hairBeard:'Стрижка + борода',service_beardTrim:'Оформлення бороди',service_royalShave:'Королівське гоління',service_kidsHaircut:'Дитяча стрижка',
      month_0:'Січень',month_1:'Лютий',month_2:'Березень',month_3:'Квітень',month_4:'Травень',month_5:'Червень',month_6:'Липень',month_7:'Серпень',month_8:'Вересень',month_9:'Жовтень',month_10:'Листопад',month_11:'Грудень',
      weekdays:['Нд','Пн','Вт','Ср','Чт','Пт','Сб']
    },
    en:{
      navHome:'Home',navServices:'Services',navReviews:'Reviews',navContact:'Contact',
      menuBook:'Book appointment',menuAccount:'My account',menuSupport:'Support',
      heroTitle:'More than a haircut.<br>It’s your standard.',heroText:'Men’s haircuts, beard grooming<br>and classic barbering in a modern format.',heroButton:'BOOK AN APPOINTMENT　→',
      chooseService:'Choose service',seeAll:'See all →',chooseBarber:'Choose barber',chooseDate:'Choose date',chooseTime:'Choose time',
      reviewsEyebrow:'REVIEWS',reviewsTitle:'Client reviews',servicesEyebrow:'SERVICES',servicesTitle:'Our Services',servicesText:'Professional grooming<br>for modern men.',viewServices:'VIEW ALL SERVICES　→',
      confirmBooking:'CONFIRM BOOKING',bookingConfirmed:'Booking confirmed',bookingConfirmedText:'Your appointment has been confirmed.',done:'Done',back:'Back',contactEyebrow:'CONTACT',accountEyebrow:'ACCOUNT',supportEyebrow:'SUPPORT',contactTitle:'Зв’яжіться з нами',contactText:'Залиште email та повідомлення. Ми зв’яжемося з вами найближчим часом.',emailPlaceholder:'Ваш email',messagePlaceholder:'Ваше повідомлення',send:'ВІДПРАВИТИ →',accountTitle:'Створити акаунт',accountText:'Зареєструйте акаунт, щоб зберігати свої записи та швидше бронювати наступний візит.',namePlaceholder:'Ім’я',accountEmailPlaceholder:'Email',passwordPlaceholder:'Пароль',register:'ЗАРЕЄСТРУВАТИСЯ →',supportTitle:'Служба підтримки',supportText:'Якщо виникла проблема із записом або сайтом, напишіть нам.',supportQ1:'Проблема із записом?',supportA1:'Перевірте вибрану послугу, барбера, дату та час.',supportQ2:'Потрібна допомога?',supportA2:'Залиште повідомлення через сторінку контактів.',supportButton:'НАПИСАТИ В ПІДТРИМКУ →',
      service_classic:'Classic Haircut',service_hairBeard:'Hair + Beard',service_beardTrim:'Beard Trim',service_royalShave:'Royal Shave',service_kidsHaircut:'Kids Haircut',
      month_0:'January',month_1:'February',month_2:'March',month_3:'April',month_4:'May',month_5:'June',month_6:'July',month_7:'August',month_8:'September',month_9:'October',month_10:'November',month_11:'December',
      weekdays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    }
  };
  window.currentLang=localStorage.getItem('cb-lang')||'ua';
  window.t=k=>(DICT[window.currentLang]||DICT.ua)[k] ?? k;
  window.servicePrice=s=>window.currentLang==='en'?s.priceEN:s.priceUA;
  window.applyLanguage=function(){
    document.documentElement.lang=window.currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
    document.querySelectorAll('.lang-code').forEach(el=>el.textContent=window.currentLang==='ua'?'EN':'UA');
    window.dispatchEvent(new Event('languagechange'));
  };
  window.toggleLanguage=function(){window.currentLang=window.currentLang==='ua'?'en':'ua';localStorage.setItem('cb-lang',window.currentLang);applyLanguage();};
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('#lang-switch-menu,#lang-switch-footer,#lang-switch-page').forEach(b=>b.addEventListener('click',toggleLanguage));
    applyLanguage();
  });
})();
