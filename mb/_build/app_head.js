const KEY = "ucsf:";
const TZ = "America/Los_Angeles";
const store = {
  get(k){ try{ return localStorage.getItem(KEY+k) }catch(e){ return null } },
  set(k,v){ try{ localStorage.setItem(KEY+k, v) }catch(e){} }
};
const qp = new URLSearchParams(location.search);
const LIVE = (qp.get("live") || CFG.live || "").replace(/\/$/, "");
