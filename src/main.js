import {relayPool} from 'nostr-tools';
import {elem} from './domutil.js';

const pool = relayPool();
pool.addRelay('wss://nostr.x1ddos.ch', {read: true, write: true});
pool.addRelay('wss://nostr.bitcoiner.social/', {read: true, write: true});
pool.addRelay('wss://relay.nostr.info', {read: true, write: true});

const feedlist = document.querySelector('#feedlist');

const dateTime = new Intl.DateTimeFormat(navigator.language, {
  dateStyle: 'full',
  timeStyle: 'long',
});

const userList = [];

function onEvent(evt, relay) {
  switch (evt.kind) {
    case 0:
      // console.log(`event.kind=0 from ${relay}`, evt);
      try {
        const content = JSON.parse(evt.content);
        setMetadata(userList, relay, evt, content);
      } catch(err) {
        console.error(err);
      }
      break;
    case 1:
      renderTextNote(evt, relay);
      break;
    case 2:
      renderRecommendServer(evt, relay);
      break;
    default:
      // console.log(`add support for ${evt.kind}`, evt)
  }
}

pool.sub({
  cb: onEvent,
  filter: {
    authors: [
      '52155da703585f25053830ac39863c80ea6adc57b360472c16c566a412d2bc38', // quark
      'a6057742e73ff93b89587c27a74edf2cdab86904291416e90dc98af1c5f70cfa', // mosc
      '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d', // fiatjaf
      // '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'  // jb55
    ]
  }
});

function renderTextNote(evt, relay) {
  const [host, img, time, userName] = getMetadata(evt, relay);
  const body = elem('div', {className: 'mbox-body', title: dateTime.format(time)}, [
    elem('header', {className: 'mbox-header'}, [
      elem('strong', {}, userName),
      ` on ${host}:`
    ]),
    evt.content // text
  ]);
  rendernArticle([img, body]);
}

function renderRecommendServer(evt, relay) {
  const [host, img, time, userName] = getMetadata(evt, relay);
  const body = elem('div', {className: 'mbox-body', title: dateTime.format(time)}, [
    elem('header', {className: 'mbox-header'}, [
      elem('strong', {}, userName),
      ` on ${host}`
    ]),
    `recommends server: ${evt.content}`
  ]);
  rendernArticle([img, body]);
}

function rendernArticle(content) {
  const art = elem('article', {className: 'mbox'}, content);
  feedlist.append(art);
}

function getMetadata(evt, relay) {
  const {host} = new URL(relay);
  const user = userList.find(user => user.pubkey === evt.pubkey);
  const userImg = user?.metadata[relay]?.picture || 'bubble.svg';
  const userName = user?.metadata[relay]?.name || evt.pubkey.slice(0, 8);
  const userAbout = user?.metadata[relay]?.about || '';
  const img = elem('img', {
    className: 'mbox-img',
    src: userImg,
    alt: `${userName}@${host}`,
    title: userAbout},
    '');
  const time = new Date(evt.created_at * 1000);
  return [host, img, time, userName];
}

function setMetadata(userList, relay, evt, content) {
  const user = userList.find(u => u.pubkey === evt.pubkey);
  if (!user) {
    userList.push({
      metadata: {
        [relay]: content
      },
      pubkey: evt.pubkey,
    });
  } else {
    user.metadata[relay] = {
      ...user.metadata[relay],
      timestamp: evt.created_at,
      ...content,
    };
    console.log('update existing user', user);
  }
}