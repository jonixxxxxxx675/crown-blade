(function(){
  const DICT={
    ua:{
      navHome:'Головна',navServices:'Послуги',navReviews:'Відгуки',navContact:'Контакти',
      menuBook:'Записатися',menuAccount:'Мій акаунт',menuBranches:'Наші відділення',menuSupport:'Служба підтримки',
      heroTitle:'Більше, ніж стрижка.<br>Це ваш стандарт.',
      heroText:'Чоловічі стрижки, оформлення бороди<br>та класичний барберинг у сучасному форматі.',heroButton:'ЗАПИСАТИСЯ НА ВІЗИТ　→',
      chooseService:'Виберіть послугу',seeAll:'Дивитися все →',chooseBarber:'Виберіть барбера',chooseDate:'Виберіть дату',chooseTime:'Виберіть час',
      reviewsEyebrow:'ВІДГУКИ',reviewsTitle:'Відгуки клієнтів',servicesEyebrow:'ПОСЛУГИ',servicesTitle:'Наші послуги',servicesText:'Професійний догляд<br>для сучасних чоловіків.',viewServices:'ПЕРЕГЛЯНУТИ ВСІ ПОСЛУГИ　→',
      confirmBooking:'ПІДТВЕРДИТИ БРОНЮВАННЯ',bookingAccountRequired:'Створіть акаунт перед бронюванням',bookingAccountRequiredText:'Це потрібно, щоб зберегти запис і надіслати підтвердження та нагадування.',paymentEyebrow:'ОПЛАТА',paymentTitle:'Онлайн-оплата',paymentCard:'Банківська картка',paymentSecure:'Безпечна оплата через платіжний сервіс',paymentCash:'Готівка',paymentCashText:'Оплата на місці після візиту',paymentConfirm:'ПІДТВЕРДИТИ →',paymentPay:'ОПЛАТИТИ →',paymentProviderMissing:'Платіжна система ще не підключена.',enableAppNotifications:'УВІМКНУТИ НАГАДУВАННЯ В ЗАСТОСУНКУ →',notificationsUnsupported:'Цей браузер не підтримує сповіщення.',notificationsEnabled:'Нагадування в застосунку увімкнено.',notificationsDenied:'Дозвіл на сповіщення не надано.',notificationsBlockedHelp:'Сповіщення заблоковані. Відкрийте налаштування цього сайту та дозвольте сповіщення, потім натисніть кнопку ще раз.',notificationsSecureRequired:'Для сповіщень потрібне захищене HTTPS-зʼєднання.',reminderApp24:'У застосунку за 24 години',reminderApp2:'У застосунку за 2 години',reminderAppText:'Сповіщення на цьому пристрої',accountPaymentMethod:'Оплата',accountPromoUntil:'діє до',accountPromoExpired:'Термін дії минув',bookingConfirmed:'Бронювання підтверджено',bookingConfirmedText:'Ваш запис успішно підтверджено.',done:'Готово',back:'Назад',contactEyebrow:'КОНТАКТИ',accountEyebrow:'АКАУНТ',supportEyebrow:'ПІДТРИМКА',contactTitle:'Зв’яжіться з нами',contactText:'Залиште email та повідомлення. Ми зв’яжемося з вами найближчим часом.',emailPlaceholder:'Ваш email',messagePlaceholder:'Ваше повідомлення',send:'ВІДПРАВИТИ →',accountTitle:'Створити акаунт',accountText:'Зареєструйте акаунт, щоб зберігати свої записи та швидше бронювати наступний візит.',accountWelcome:'Мій акаунт',accountBookings:'Мої бронювання',accountNoBookings:'У вас ще немає бронювань.',accountLogout:'ВИЙТИ',accountCancel:'СКАСУВАТИ',accountEdit:'ЗМІНИТИ',accountCancelled:'Бронювання скасовано.',accountUpdated:'Бронювання оновлено.',accountConfirmed:'ПІДТВЕРДЖЕНО',accountRegistered:'Акаунт створено.',accountCreating:'Створюємо акаунт…',accountVerificationSent:'Перевірте email — ми надіслали посилання для підтвердження.',accountLocalSaved:'Акаунт збережено на цьому пристрої. Email-верифікація буде доступна після підключення поштового сервісу.',accountEmailVerified:'Email підтверджено ✓',accountEmailPending:'Email ще не підтверджено',namePlaceholder:'Ім’я',accountEmailPlaceholder:'Email',phonePlaceholder:'Номер телефону',passwordPlaceholder:'Пароль',register:'ЗАРЕЄСТРУВАТИСЯ →',accountLogin:'УВІЙТИ',accountCreate:'СТВОРИТИ АКАУНТ',accountForgot:'Забули пароль?',accountLoginTitle:'Увійти',accountLoginText:'Увійдіть, щоб переглядати свої бронювання.',accountPhoneInvalid:'Введіть коректний номер телефону.',accountPasswordShort:'Пароль має містити щонайменше 6 символів.',accountLoginError:'Невірний email або пароль.',accountForgotText:'Для відновлення пароля зверніться до підтримки.',accountShowPassword:'Показати пароль',accountHidePassword:'Сховати пароль',accountProfileTab:'ПРОФІЛЬ',accountBookingsTab:'БРОНЮВАННЯ',accountRemindersTab:'НАГАДУВАННЯ',accountPromosTab:'АКЦІЇ / ПРОМОКОДИ',accountPromosTitle:'Акції та промокоди',accountPromosText:'Тут зберігаються ваші персональні промокоди.',accountPromoFirst:'Промокод за першу реєстрацію',accountPromoCopy:'КОПІЮВАТИ',accountPromoCopied:'СКОПІЙОВАНО',accountEditData:'РЕДАГУВАТИ ДАНІ →',accountSaveData:'ЗБЕРЕГТИ',accountCancelEdit:'СКАСУВАТИ',accountRemindersTitle:'Нагадування',reminder24:'Email за 24 години',reminder24Text:'Нагадування перед візитом',reminder2:'Email за 2 години',reminder2Text:'Коротке нагадування перед записом',reminderCancel:'Лист при скасуванні',reminderCancelText:'Окреме повідомлення після скасування',promoEyebrow:'WELCOME',promoTitle:'Ваш подарунок',promoText:'Для першого візиту ви отримуєте знижку 10%.',promoHint:'Застосуйте код під час бронювання.',supportTitle:'Служба підтримки',supportText:'Якщо виникла проблема із записом або сайтом, напишіть нам.',supportQ1:'Проблема із записом?',supportA1:'Перевірте вибрану послугу, барбера, дату та час.',supportQ2:'Потрібна допомога?',supportA2:'Залиште повідомлення через сторінку контактів.',supportButton:'НАПИСАТИ В ПІДТРИМКУ →',
      service_classic:'Класична стрижка',service_hairBeard:'Стрижка + борода',service_beardTrim:'Оформлення бороди',service_royalShave:'Королівське гоління',service_kidsHaircut:'Дитяча стрижка',
      month_0:'Січень',month_1:'Лютий',month_2:'Березень',month_3:'Квітень',month_4:'Травень',month_5:'Червень',month_6:'Липень',month_7:'Серпень',month_8:'Вересень',month_9:'Жовтень',month_10:'Листопад',month_11:'Грудень',
      weekdays:['Нд','Пн','Вт','Ср','Чт','Пт','Сб']
    },
    en:{
      navHome:'Home',navServices:'Services',navReviews:'Reviews',navContact:'Contact',
      menuBook:'Book appointment',menuAccount:'My account',menuBranches:'Our locations',menuSupport:'Support',
      heroTitle:'More than a haircut.<br>It’s your standard.',heroText:'Men’s haircuts, beard grooming<br>and classic barbering in a modern format.',heroButton:'BOOK AN APPOINTMENT　→',
      chooseService:'Choose service',seeAll:'See all →',chooseBarber:'Choose barber',chooseDate:'Choose date',chooseTime:'Choose time',
      reviewsEyebrow:'REVIEWS',reviewsTitle:'Client reviews',servicesEyebrow:'SERVICES',servicesTitle:'Our Services',servicesText:'Professional grooming<br>for modern men.',viewServices:'VIEW ALL SERVICES　→',
      confirmBooking:'CONFIRM BOOKING',bookingAccountRequired:'Create an account before booking',bookingAccountRequiredText:'This lets us save your appointment and send confirmation and reminders.',paymentEyebrow:'PAYMENT',paymentTitle:'Online payment',paymentCard:'Bank ',paymentSecure:'Secure payment through the payment provider',paymentCash:'Cash',paymentCashText:'Pay at the barbershop after the visit',paymentConfirm:'CONFIRM →',paymentPay:'PAY →',paymentProviderMissing:'The payment system is not connected yet.',enableAppNotifications:'ENABLE IN-APP REMINDERS →',notificationsUnsupported:'This browser does not support notifications.',notificationsEnabled:'In-app reminders are enabled.',notificationsDenied:'Notification permission was not granted.',notificationsBlockedHelp:'Notifications are blocked. Open this site’s settings, allow notifications, then press the button again.',notificationsSecureRequired:'Notifications require a secure HTTPS connection.',reminderApp24:'In-app reminder 24 hours before',reminderApp2:'In-app reminder 2 hours before',reminderAppText:'Notification on this device',accountPaymentMethod:'Payment',accountPromoUntil:'valid until',accountPromoExpired:'Expired',bookingConfirmed:'Booking confirmed',bookingConfirmedText:'Your appointment has been confirmed.',done:'Done',back:'Back',contactEyebrow:'CONTACT',accountEyebrow:'ACCOUNT',supportEyebrow:'SUPPORT',contactTitle:'Contact us',contactText:'Leave your email and message. We will get back to you shortly.',emailPlaceholder:'Your email',messagePlaceholder:'Your message',send:'SEND →',accountTitle:'Create an account',accountText:'Create an account to save your bookings and book your next visit faster.',accountWelcome:'My account',accountBookings:'My bookings',accountNoBookings:'You have no bookings yet.',accountLogout:'LOG OUT',accountCancel:'CANCEL',accountEdit:'EDIT',accountCancelled:'Booking cancelled.',accountUpdated:'Booking updated.',accountConfirmed:'CONFIRMED',accountRegistered:'Account created.',accountCreating:'Creating account…',accountVerificationSent:'Check your email — we sent a verification link.',accountLocalSaved:'Account saved on this device. Email verification will work after the mail service is connected.',accountEmailVerified:'Email verified ✓',accountEmailPending:'Email not verified yet',namePlaceholder:'Name',accountEmailPlaceholder:'Email',phonePlaceholder:'Phone number',passwordPlaceholder:'Password',register:'CREATE ACCOUNT →',accountLogin:'LOG IN',accountCreate:'CREATE ACCOUNT',accountForgot:'Forgot password?',accountLoginTitle:'Log in',accountLoginText:'Log in to view your bookings.',accountPhoneInvalid:'Enter a valid phone number.',accountPasswordShort:'Password must contain at least 6 characters.',accountLoginError:'Incorrect email or password.',accountForgotText:'Contact support to reset your password.',accountShowPassword:'Show password',accountHidePassword:'Hide password',accountProfileTab:'PROFILE',accountBookingsTab:'BOOKINGS',accountRemindersTab:'REMINDERS',accountPromosTab:'OFFERS / PROMO CODES',accountPromosTitle:'Offers and promo codes',accountPromosText:'Your personal promo codes are stored here.',accountPromoFirst:'Promo code for your first registration',accountPromoCopy:'COPY',accountPromoCopied:'COPIED',accountEditData:'EDIT DATA →',accountSaveData:'SAVE',accountCancelEdit:'CANCEL',accountRemindersTitle:'Reminders',reminder24:'Email 24 hours before',reminder24Text:'Reminder before your visit',reminder2:'Email 2 hours before',reminder2Text:'Short reminder before the appointment',reminderCancel:'Cancellation email',reminderCancelText:'Separate message after cancellation',promoEyebrow:'WELCOME',promoTitle:'Your gift',promoText:'Get 10% off your first visit.',promoHint:'Use the code during booking.',supportTitle:'Support',supportText:'If you have a problem with your booking or the website, contact us.',supportQ1:'Problem with a booking?',supportA1:'Check the selected service, barber, date and time.',supportQ2:'Need help?',supportA2:'Leave us a message through the contact page.',supportButton:'CONTACT SUPPORT →',
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
  window.setLanguage=function(lang){
    if(lang!=='ua'&&lang!=='en')return;
    window.currentLang=lang;
    localStorage.setItem('cb-lang',lang);
    document.querySelectorAll('.lang-dropdown').forEach(el=>el.classList.remove('open'));
    document.querySelectorAll('.lang-switch').forEach(el=>el.setAttribute('aria-expanded','false'));
    applyLanguage();
  };

  function setupLanguageControl(button){
    if(!button||button.dataset.langReady)return;
    button.dataset.langReady='true';
    const wrapper=document.createElement('div');
    wrapper.className='lang-control';
    button.parentNode.insertBefore(wrapper,button);
    wrapper.appendChild(button);
    button.innerHTML='<span class="lang-globe" aria-hidden="true"></span><span class="lang-code">'+window.currentLang.toUpperCase()+'</span><span class="lang-chevron">⌄</span>';
    button.setAttribute('aria-haspopup','listbox');
    button.setAttribute('aria-expanded','false');

    const dropdown=document.createElement('div');
    dropdown.className='lang-dropdown';
    dropdown.setAttribute('role','listbox');
    dropdown.innerHTML='<button type="button" role="option" data-lang="ua"><span>UA</span><small>Українська</small></button><button type="button" role="option" data-lang="en"><span>EN</span><small>English</small></button>';
    wrapper.appendChild(dropdown);

    button.addEventListener('click',e=>{
      e.stopPropagation();
      const open=dropdown.classList.toggle('open');
      button.setAttribute('aria-expanded',open?'true':'false');
    });
    dropdown.querySelectorAll('[data-lang]').forEach(option=>option.addEventListener('click',e=>{
      e.stopPropagation();
      window.setLanguage(option.dataset.lang);
    }));
  }

  function injectMobilePolish(){
    if(document.getElementById('cb-mobile-polish'))return;
    const style=document.createElement('style');
    style.id='cb-mobile-polish';
    style.textContent=`
@media(max-width:800px){
  .booking .confirm{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:calc(100% - 16px)!important;margin:18px 8px 0!important;min-height:58px!important;padding:12px 16px!important;border-radius:14px!important;text-align:center!important;white-space:nowrap!important}
  .booking .confirm span:first-child{display:block!important;font-family:Inter,sans-serif!important;font-size:clamp(9px,2.9vw,12px)!important;line-height:1!important;letter-spacing:.055em!important;text-align:center!important}
  .booking .confirm span:last-child{font-size:16px!important;line-height:1!important;flex:0 0 auto!important}
  .lang-control{position:relative;display:inline-flex!important;align-items:center;justify-content:center}
  .mobile-menu-panel .lang-control{margin-top:10px;flex:0 0 auto}.mobile-footer-nav .lang-control{margin:0 0 0 auto;flex:0 0 auto}
  .lang-control .lang-switch{margin:0!important;min-width:76px!important;height:36px!important;padding:7px 10px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;border-radius:999px!important;box-sizing:border-box!important}
  .lang-globe{position:relative;display:inline-block;width:18px;height:18px;border:1.8px solid currentColor;border-radius:50%;flex:0 0 18px;box-sizing:border-box}
  .lang-globe:before{content:"";position:absolute;left:1px;right:1px;top:6px;height:4px;border-top:1.4px solid currentColor;border-bottom:1.4px solid currentColor;border-radius:50%}
  .lang-globe:after{content:"";position:absolute;top:0px;bottom:0px;left:5px;width:6px;border-left:1.4px solid currentColor;border-right:1.4px solid currentColor;border-radius:50%}
  .lang-code{font:600 9px/1 Inter,sans-serif!important;letter-spacing:.05em!important}.lang-chevron{font:14px/1 Inter,sans-serif;transform:translateY(-1px)}
  .lang-dropdown{position:absolute;z-index:1200;right:0;top:calc(100% + 8px);width:154px;padding:5px;border:1px solid #c89d6566;border-radius:12px;background:linear-gradient(180deg,#181513,#0d0c0b);box-shadow:0 18px 38px #000b,inset 0 1px 0 #ffffff10;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-5px);transition:opacity .16s ease,transform .16s ease,visibility .16s ease}
  .lang-dropdown.open{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}
  .lang-dropdown button{width:100%;display:grid;grid-template-columns:32px 1fr;align-items:center;gap:8px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#e7ded5;text-align:left}
  .lang-dropdown button:active,.lang-dropdown button:hover{background:#d8a96d14;color:#e3b477}.lang-dropdown button span{font:600 9px/1 Inter,sans-serif;letter-spacing:.06em}.lang-dropdown button small{font:10px/1.2 Inter,sans-serif;color:#9f958c}
}
@media(min-width:801px){#cb-mobile-polish{display:none}}
`;
    document.head.appendChild(style);
  }
  document.addEventListener('DOMContentLoaded',function(){
    injectMobilePolish();
    document.querySelectorAll('#lang-switch-menu,#lang-switch-footer,#lang-switch-page').forEach(setupLanguageControl);
    document.addEventListener('click',()=>document.querySelectorAll('.lang-dropdown').forEach(el=>el.classList.remove('open')));
    applyLanguage();
  });
})();
