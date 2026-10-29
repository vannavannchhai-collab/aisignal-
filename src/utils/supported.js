'use strict';
/**
 * Supported domains catalogue.
 * category: shortener | ad | social | file | general
 * method: redirect = follows HTTP redirects; extract = also parses HTML for destination; best-effort = site may require human interaction/captcha
 */
const SUPPORTED = [
  // Popular shorteners
  ...['bit.ly','tinyurl.com','t.co','rb.gy','rebrand.ly','is.gd','v.gd','shorturl.at','tiny.cc','s.id','cutt.ly','bl.ink','short.io','shrtco.de','qr.ae','clck.ru','trib.al','lnkd.in','buff.ly','ow.ly','dlvr.it','ift.tt','x.co','yourls.org','gg.gg','urlz.fr','qr.net','tr.im','plu.sh','1url.com','shorturl.com'].map(d=>({domain:d,category:'shortener',method:'redirect'})),
  // Ad / interstitial shorteners (best effort public-redirect extraction)
  ...['adf.ly','ouo.io','ouo.press','shorte.st','bc.vc','exe.io','exey.io','bcvc.ink','adfoc.us','ay.live','za.gl','fc.lc','fc-lc.com','shrinkme.io','shrinkearn.com','clk.sh','clk.asia','linkvertise.com','link-to.net','link-center.net','link-target.net','loot-link.com','lootlinks.co','lootlinks.com','linksloot.net','sub2unlock.com','sub2unlock.vip','rekonise.com','socialwolves.io','mboost.me','boost.ink','work.ink','workink.net','letsboost.net','krnl.place','scriptpastebin.com','paste-drop.com','pastebin.com','direct-link.net','up-to-down.net'].map(d=>({domain:d,category:'ad',method:'best-effort'})),
  // Social / platform short links
  ...['youtu.be','fb.me','fb.watch','ig.me','vm.tiktok.com','vt.tiktok.com','pin.it','redd.it','amzn.to','a.co','ebay.to','spotify.link','open.spotify.com','music.apple.com','sptfy.com','discord.gg','t.me','wa.me','youtu.be','ngl.link','bio.link','linktr.ee'].map(d=>({domain:d,category:'social',method:'redirect'})),
  // File / download gateways (public redirect only)
  ...['mediafire.com','terabox.com','drive.google.com','mega.nz','gofile.io','pixeldrain.com','anonfiles.com','sendspace.com','zippyshare.com','uploadhaven.com','krakenfiles.com','filemoon.sx'].map(d=>({domain:d,category:'file',method:'redirect'})),
  // News / general redirectors
  ...['l.facebook.com','lm.facebook.com','www.google.com','href.li','steamcommunity.com','outgoing.prod.mozaws.net','slack-redir.net','away.vk.com','jump.bdimg.com','duckduckgo.com'].map(d=>({domain:d,category:'general',method:'redirect'})),
];
const BY_DOMAIN = new Map(SUPPORTED.map(s=>[s.domain,s]));
function findSupported(hostname){
  const h=(hostname||'').toLowerCase().replace(/^www\./,'');
  if(BY_DOMAIN.has(h)) return BY_DOMAIN.get(h);
  if(BY_DOMAIN.has(hostname)) return BY_DOMAIN.get(hostname);
  // subdomain match e.g. www.linkvertise.com handled, foo.bit.ly
  for(const s of SUPPORTED){ if(h.endsWith('.'+s.domain)) return s; }
  return null;
}
function isShortener(hostname){ return !!findSupported(hostname); }
module.exports={SUPPORTED,findSupported,isShortener};
