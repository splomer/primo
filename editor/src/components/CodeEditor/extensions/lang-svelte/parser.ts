import { ContextTracker, ExternalTokenizer, LRParser } from '@lezer/lr';
import { styleTags, tags } from '@lezer/highlight';
import { parseMixed } from '@lezer/common';

// This file was generated by lezer-generator. You probably shouldn't edit it.
const scriptText = 59,
  StartCloseScriptTag = 1,
  styleText = 60,
  StartCloseStyleTag = 2,
  textareaText = 61,
  StartCloseTextareaTag = 3,
  StartTag = 4,
  StartScriptTag = 5,
  StartStyleTag = 6,
  StartTextareaTag = 7,
  StartSelfClosingTag = 8,
  StartCloseTag = 9,
  NoMatchStartCloseTag = 10,
  MismatchedStartCloseTag = 11,
  missingCloseTag = 62,
  IncompleteCloseTag = 12,
  commentContent$1 = 63,
  Element = 20,
  ScriptText = 29,
  StyleText = 32,
  TextareaText = 35,
  OpenTag = 37,
  Dialect_noMatch = 0;

/* Hand-written tokenizers for HTML. */

const selfClosers = {
  area: true, base: true, br: true, col: true, command: true,
  embed: true, frame: true, hr: true, img: true, input: true,
  keygen: true, link: true, meta: true, param: true, source: true,
  track: true, wbr: true, menuitem: true
};

const implicitlyClosed = {
  dd: true, li: true, optgroup: true, option: true, p: true,
  rp: true, rt: true, tbody: true, td: true, tfoot: true,
  th: true, tr: true
};

const closeOnOpen = {
  dd: { dd: true, dt: true },
  dt: { dd: true, dt: true },
  li: { li: true },
  option: { option: true, optgroup: true },
  optgroup: { optgroup: true },
  p: {
    address: true, article: true, aside: true, blockquote: true, dir: true,
    div: true, dl: true, fieldset: true, footer: true, form: true,
    h1: true, h2: true, h3: true, h4: true, h5: true, h6: true,
    header: true, hgroup: true, hr: true, menu: true, nav: true, ol: true,
    p: true, pre: true, section: true, table: true, ul: true, each: true
  },
  rp: { rp: true, rt: true },
  rt: { rp: true, rt: true },
  tbody: { tbody: true, tfoot: true },
  td: { td: true, th: true },
  tfoot: { tbody: true },
  th: { td: true, th: true },
  thead: { tbody: true, tfoot: true },
  tr: { tr: true }
};

function nameChar(ch) {
  return ch == 45 || ch == 46 || ch == 58 || ch >= 65 && ch <= 90 || ch == 95 || ch >= 97 && ch <= 122 || ch >= 161
}

function isSpace(ch) {
  return ch == 9 || ch == 10 || ch == 13 || ch == 32
}

let cachedName = null, cachedInput = null, cachedPos = 0;
function tagNameAfter(input, offset) {
  let pos = input.pos + offset;
  if (cachedPos == pos && cachedInput == input) return cachedName
  let next = input.peek(offset);
  while (isSpace(next)) next = input.peek(++offset);
  let name = "";
  for (; ;) {
    if (!nameChar(next)) break
    name += String.fromCharCode(next);
    next = input.peek(++offset);
  }
  // Undefined to signal there's a <? or <!, null for just missing
  cachedInput = input; cachedPos = pos;
  return cachedName = name ? name.toLowerCase() : next == question || next == bang ? undefined : null
}

const lessThan = 60, greaterThan = 62, slash = 47, question = 63, bang = 33, dash = 45;

function ElementContext(name, parent) {
  this.name = name;
  this.parent = parent;
  this.hash = parent ? parent.hash : 0;
  for (let i = 0; i < name.length; i++) this.hash += (this.hash << 4) + name.charCodeAt(i) + (name.charCodeAt(i) << 8);
}

const startTagTerms = [StartTag, StartSelfClosingTag, StartScriptTag, StartStyleTag, StartTextareaTag];

const elementContext = new ContextTracker({
  start: null,
  shift(context, term, stack, input) {
    return startTagTerms.indexOf(term) > -1 ? new ElementContext(tagNameAfter(input, 1) || "", context) : context
  },
  reduce(context, term) {
    return term == Element && context ? context.parent : context
  },
  reuse(context, node, stack, input) {
    let type = node.type.id;
    return type == StartTag || type == OpenTag
      ? new ElementContext(tagNameAfter(input, 1) || "", context) : context
  },
  hash(context) { return context ? context.hash : 0 },
  strict: false
});

const tagStart = new ExternalTokenizer((input, stack) => {
  if (input.next != lessThan) {
    // End of file, close any open tags
    if (input.next < 0 && stack.context) input.acceptToken(missingCloseTag);
    return
  }
  input.advance();
  let close = input.next == slash;
  if (close) input.advance();
  let name = tagNameAfter(input, 0);
  if (name === undefined) return
  if (!name) return input.acceptToken(close ? IncompleteCloseTag : StartTag)

  let parent = stack.context ? stack.context.name : null;
  if (close) {
    if (name == parent) return input.acceptToken(StartCloseTag)
    if (parent && implicitlyClosed[parent]) return input.acceptToken(missingCloseTag, -2)
    if (stack.dialectEnabled(Dialect_noMatch)) return input.acceptToken(NoMatchStartCloseTag)
    for (let cx = stack.context; cx; cx = cx.parent) if (cx.name == name) return
    input.acceptToken(MismatchedStartCloseTag);
  } else {
    if (name == "script") return input.acceptToken(StartScriptTag)
    if (name == "style") return input.acceptToken(StartStyleTag)
    if (name == "textarea") return input.acceptToken(StartTextareaTag)
    if (selfClosers.hasOwnProperty(name)) return input.acceptToken(StartSelfClosingTag)
    if (parent && closeOnOpen[parent] && closeOnOpen[parent][name]) input.acceptToken(missingCloseTag, -1);
    else input.acceptToken(StartTag);
  }
}, { contextual: true });

const commentContent = new ExternalTokenizer(input => {
  for (let dashes = 0, i = 0; ; i++) {
    if (input.next < 0) {
      if (i) input.acceptToken(commentContent$1);
      break
    }
    if (input.next == dash) {
      dashes++;
    } else if (input.next == greaterThan && dashes >= 2) {
      if (i > 3) input.acceptToken(commentContent$1, -2);
      break
    } else {
      dashes = 0;
    }
    input.advance();
  }
});

function contentTokenizer(tag, textToken, endToken) {
  let lastState = 2 + tag.length;
  return new ExternalTokenizer(input => {
    // state means:
    // - 0 nothing matched
    // - 1 '<' matched
    // - 2 '</' + possibly whitespace matched
    // - 3-(1+tag.length) part of the tag matched
    // - lastState whole tag + possibly whitespace matched
    for (let state = 0, matchedLen = 0, i = 0; ; i++) {
      if (input.next < 0) {
        if (i) input.acceptToken(textToken);
        break
      }
      if (state == 0 && input.next == lessThan ||
        state == 1 && input.next == slash ||
        state >= 2 && state < lastState && input.next == tag.charCodeAt(state - 2)) {
        state++;
        matchedLen++;
      } else if ((state == 2 || state == lastState) && isSpace(input.next)) {
        matchedLen++;
      } else if (state == lastState && input.next == greaterThan) {
        if (i > matchedLen)
          input.acceptToken(textToken, -matchedLen);
        else
          input.acceptToken(endToken, -(matchedLen - 2));
        break
      } else if ((input.next == 10 /* '\n' */ || input.next == 13 /* '\r' */) && i) {
        input.acceptToken(textToken, 1);
        break
      } else {
        state = matchedLen = 0;
      }
      input.advance();
    }
  })
}

const scriptTokens = contentTokenizer("script", scriptText, StartCloseScriptTag);

const styleTokens = contentTokenizer("style", styleText, StartCloseStyleTag);

const textareaTokens = contentTokenizer("textarea", textareaText, StartCloseTextareaTag);

const htmlHighlighting = styleTags({
  "Text RawText": tags.content,
  "StartTag StartCloseTag SelfCloserEndTag EndTag SelfCloseEndTag": tags.angleBracket,
  "TagName": tags.tagName,
  "MismatchedCloseTag/TagName": [tags.tagName, tags.invalid],
  "AttributeName EventDirectiveEvent": tags.attributeName,
  "AttributeValue UnquotedAttributeValue EventDirective": tags.attributeValue,
  Is: tags.definitionOperator,
  "EntityReference SvelteOpenTag SvelteCloseTag CharacterReference": tags.character,
  Comment: tags.blockComment,
  "ProcessingInst": tags.processingInstruction,
  DoctypeDecl: tags.documentMeta,
  SvelteVariable: tags.angleBracket
});

// This file was generated by lezer-generator. You probably shouldn't edit it.
const spec_Text = { __proto__: null, special: 146 };
const parser = LRParser.deserialize({
  version: 14,
  states: "-OOVOxOOO!jQ!bO'#CqO!oQ!bO'#C{O!tQ!bO'#DOO!yQ!bO'#DRO#OQ!bO'#DTO#TOXO'#CpO#`OYO'#CpO#kO[O'#CpO%ZOxO'#CpOOOW'#Cp'#CpO%bO!rO'#DUO%jQ!bO'#DZO%oQ!bO'#D[OOOW'#D]'#D]OOOW'#Dp'#DpOOOW'#D_'#D_QVOxOOO%tQ#tO,59]O&PQ#tO,59gO&[Q#tO,59jO&gQ#tO,59mO&rQ#tO,59oOOOX'#Dc'#DcO&}OXO'#CyO'YOXO,59[OOOY'#Dd'#DdO'bOYO'#C|O'mOYO,59[OOO['#De'#DeO'uO[O'#DPO(QO[O,59[OOOW'#Df'#DfO(YOxO,59[O(aQ!bO'#DSOOOW,59[,59[OOO`'#Dg'#DgO(fO!rO,59pOOOW,59p,59pO(nQ!bO,59uO(sQ!bO,59vOOOW-E7]-E7]O(xQ#tO'#CsOOQO'#D`'#D`O)WQ#tO1G.wOOOX1G.w1G.wO)cQ#tO1G/ROOOY1G/R1G/RO)nQ#tO1G/UOOO[1G/U1G/UO)yQ#tO1G/XOOOW1G/X1G/XO*UQ#tO1G/ZOOOW1G/Z1G/ZOOOX-E7a-E7aO*aQ!bO'#CzOOOW1G.v1G.vOOOY-E7b-E7bO*fQ!bO'#C}OOO[-E7c-E7cO*kQ!bO'#DQOOOW-E7d-E7dO*pQ!bO,59nOOO`-E7e-E7eOOOW1G/[1G/[OOOW1G/a1G/aOOOW1G/b1G/bO*uQ&jO,59_OOQO-E7^-E7^OOOX7+$c7+$cOOOY7+$m7+$mOOO[7+$p7+$pOOOW7+$s7+$sOOOW7+$u7+$uO+QQ!bO,59fO+VQ!bO,59iO+[Q!bO,59lOOOW1G/Y1G/YO+aO,UO'#CvO+oO7[O'#CvOOQO1G.y1G.yOOOW1G/Q1G/QOOOW1G/T1G/TOOOW1G/W1G/WOOOO'#Da'#DaO+}O,UO,59bOOQO,59b,59bOOOO'#Db'#DbO,]O7[O,59bOOOO-E7_-E7_OOQO1G.|1G.|OOOO-E7`-E7`",
  stateData: ",z~O!cOS~OSSOTPOUQOVROWTOY]OZ[O[_O^_O__O`_Oa_Ob_Oc_Oy_Oz_O{_O|_O!Q`O!iZO!k^O~OfbO~OfcO~OfdO~OfeO~OffO~O!]gOPmP!`mP~O!^jOQpP!`pP~O!_mORsP!`sP~OSSOTPOUQOVROWTOXrOY]OZ[O[_O^_O__O`_Oa_Ob_Oc_Oy_Oz_O{_O|_O!iZO!k^O~O!`sO~P#vO!atO!jvO~OfwO~OfxO~O_zOhzOl}O~O_zOhzOl!PO~O_zOhzOl!RO~O_zOhzOl!TO~O_zOhzOl!VO~O!]gOPmX!`mX~OP!XO!`!YO~O!^jOQpX!`pX~OQ![O!`!YO~O!_mORsX!`sX~OR!^O!`!YO~O!`!YO~P#vOf!`O~O!atO!j!bO~Ol!cO~Ol!dO~Oi!eO_gXhgXlgX~O_zOhzOl!gO~O_zOhzOl!hO~O_zOhzOl!iO~O_zOhzOl!jO~O_zOhzOl!kO~Of!lO~Of!mO~Of!nO~Ol!oO~Ok!rO!e!pO!g!qO~Ol!sO~Ol!tO~Ol!uO~Oa!vOb!vO!e!xO!f!vO~Oa!yOb!yO!g!xO!h!yO~Oa!vOb!vO!e!|O!f!vO~Oa!yOb!yO!g!|O!h!yO~Obac!iy!Qz{|_^h`_~",
  goto: "%u!ePPPPPPPPPPPPPPPPPPPP!f!lP!rPP#OPP#R#U#X#_#b#e#k#n#q#w#}!fPPPP!f!f!fP$T$Z$q$w$}%T%Z%a%gPPPPPPPP%mX_OXaqXUOXaqe{bcdef|!O!Q!S!UR!r!eRiUR!YiXVOXaqRlVR!YlXWOXaqRoWR!YoXXOXaqQsXR!YqXYOXaqQaORyaQ|bQ!OcQ!QdQ!SeQ!UfZ!f|!O!Q!S!UQ!w!pR!{!wQ!z!qR!}!zQhUR!WhQkVR!ZkQnWR!]nQqXR!_qQuZR!auS`OaTpXq",
  nodeNames: "⚠ StartCloseTag StartCloseTag StartCloseTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteCloseTag Document EventDirectiveEvent EventDirective Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue EndTag ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst SvelteOpenTag SvelteCloseTag SvelteVariable MismatchedCloseTag CloseTag NewExpression DoctypeDecl",
  maxTerm: 73,
  context: elementContext,
  nodeProps: [
    ["closedBy", -11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, "EndTag", -4, 21, 31, 34, 37, "CloseTag", 42, "SvelteCloseTag"],
    ["group", -15, 12, 14, 15, 17, 18, 19, 20, 40, 41, 42, 43, 44, 45, 46, 47, "Entity", 16, "Entity TextContent", -3, 29, 32, 35, "TextContent Entity"],
    ["openedBy", 28, "StartTag StartCloseTag", -4, 30, 33, 36, 38, "OpenTag", 43, "SvelteOpenTag"]
  ],
  propSources: [htmlHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 9,
  tokenData: "%@x!aR!bOX%ZXY*cYZ*cZ]%Z]^*c^p%Zpq*cqr%Zrs+jsv%Zvw,Swx3ix}%Z}!O4U!O!P%Z!P!Q7}!Q![%Z![!]9e!]!^%Z!^!_?Q!_!`LU!`!a8s!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#U9e#U#VLv#V#W!8t#W#]9e#]#^!IV#^#c9e#c#d!M[#d#h9e#h#i#'l#i#o9e#o#p#Ln#p$f%Z$f$g&q$g%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U%Z4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!Z%fckW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a$f%Z$f$g&q$g~%Z!R&zV!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&qq'hT!hp`POv'awx'wx!^'a!^!_(V!_~'aP'|R`POv'ww!^'w!_~'wp([Q!hpOv(Vx~(Va(iU!f``POr(brs'wsv(bw!^(b!^!_({!_~(b`)QR!f`Or({sv({w~({!Q)bT!f`!hpOr)Zrs(Vsv)Zwx({x~)ZW)vXkWOX)qZ])q^p)qqr)qsw)qx!P)q!Q!^)q!a$f)q$g~)q!a*n^!f`!hp!c^`POX&qXY*cYZ*cZ]&q]^*c^p&qpq*cqr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&q!Z+sT!eh!hp`POv'awx'wx!^'a!^!_(V!_~'a!Z,ZbkWcPOX-cXZ.pZ]-c]^.p^p-cqr-crs.pst/{tw-cwx.px!P-c!P!Q.p!Q!]-c!]!^)q!^!a.p!a$f-c$f$g.p$g~-c!Z-hbkWOX-cXZ.pZ]-c]^.p^p-cqr-crs.pst)qtw-cwx.px!P-c!P!Q.p!Q!]-c!]!^/X!^!a.p!a$f-c$f$g.p$g~-c!R.sTOp.pqs.pt!].p!]!^/S!^~.p!R/XOa!R!Z/`XkWa!ROX)qZ])q^p)qqr)qsw)qx!P)q!Q!^)q!a$f)q$g~)q!Z0QakWOX1VXZ2aZ]1V]^2a^p1Vqr1Vrs2asw1Vwx2ax!P1V!P!Q2a!Q!]1V!]!^)q!^!a2a!a$f1V$f$g2a$g~1V!Z1[akWOX1VXZ2aZ]1V]^2a^p1Vqr1Vrs2asw1Vwx2ax!P1V!P!Q2a!Q!]1V!]!^2u!^!a2a!a$f1V$f$g2a$g~1V!R2dSOp2aq!]2a!]!^2p!^~2a!R2uOb!R!Z2|XkWb!ROX)qZ])q^p)qqr)qsw)qx!P)q!Q!^)q!a$f)q$g~)q!Z3rU!gx!f``POr(brs'wsv(bw!^(b!^!_({!_~(b!]4aekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O5r!O!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a$f%Z$f$g&q$g~%Z!]5}dkW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!`&q!`!a7]!a$f%Z$f$g&q$g~%Z!T7hV!f`!hp!jQ`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&q!X8WX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_!`&q!`!a8s!a~&q!X9OVlU!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&q!a9t!YfQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a=oekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a$f%Z$f$g&q$g;=`%Z;=`<%l9e<%l~%Z!R?ZU!f`!hpyPOq)Zqr?mrs(Vsv)Zwx({x~)Z!R?tZ!f`!hpOr)Zrs(Vsv)Zwx({x})Z}!O@g!O!f)Z!f!gAm!g#W)Z#W#XHf#X~)Z!R@nV!f`!hpOr)Zrs(Vsv)Zwx({x})Z}!OAT!O~)Z!RA^T!f`!hp!iPOr)Zrs(Vsv)Zwx({x~)Z!RAtV!f`!hpOr)Zrs(Vsv)Zwx({x!q)Z!q!rBZ!r~)Z!RBbV!f`!hpOr)Zrs(Vsv)Zwx({x!e)Z!e!fBw!f~)Z!RCOV!f`!hpOr)Zrs(Vsv)Zwx({x!v)Z!v!wCe!w~)Z!RClV!f`!hpOr)Zrs(Vsv)Zwx({x!{)Z!{!|DR!|~)Z!RDYV!f`!hpOr)Zrs(Vsv)Zwx({x!r)Z!r!sDo!s~)Z!RDvV!f`!hpOr)Zrs(Vsv)Zwx({x!g)Z!g!hE]!h~)Z!REdW!f`!hpOrE]rsE|svE]vwFbwxGQx!`E]!`!aG|!a~E]qFRT!hpOvE|vxFbx!`E|!`!aFs!a~E|PFeRO!`Fb!`!aFn!a~FbPFsO!QPqFzQ!hp!QPOv(Vx~(VaGVV!f`OrGQrsFbsvGQvwFbw!`GQ!`!aGl!a~GQaGsR!f`!QPOr({sv({w~({!RHVT!f`!hp!QPOr)Zrs(Vsv)Zwx({x~)Z!RHmV!f`!hpOr)Zrs(Vsv)Zwx({x#c)Z#c#dIS#d~)Z!RIZV!f`!hpOr)Zrs(Vsv)Zwx({x#V)Z#V#WIp#W~)Z!RIwV!f`!hpOr)Zrs(Vsv)Zwx({x#h)Z#h#iJ^#i~)Z!RJeV!f`!hpOr)Zrs(Vsv)Zwx({x#m)Z#m#nJz#n~)Z!RKRV!f`!hpOr)Zrs(Vsv)Zwx({x#d)Z#d#eKh#e~)Z!RKoV!f`!hpOr)Zrs(Vsv)Zwx({x#X)Z#X#YE]#Y~)Z!VLaViS!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&q!aMV![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#]9e#]#^!!{#^#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!#[![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#b9e#b#c!'Q#c#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!'a![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#W9e#W#X!+V#X#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!+f!YfQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]!/U!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!/g!YfQkW!f`!hp_ThS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]!3V!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}!3V!}#R%Z#R#S!3V#S#T%Z#T#o!3V#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o!3V%o%p%Z%p&a!3V&a&b%Z&b1p!3V1p4U9e4U4d!3V4d4e%Z4e$IS!3V$IS$I`%Z$I`$Ib!3V$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t!3V%#t&/x%Z&/x&Et!3V&Et&FV%Z&FV;'S!3V;'S;:j!7W;:j?&r%Z?&r?Ah!3V?Ah?BY%Z?BY?Mn!3V?Mn~%Z!a!3h!YfQkW!f`!hp^PhS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O!3V!O!P!3V!P!Q&q!Q![!3V![!]!3V!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}!3V!}#R%Z#R#S!3V#S#T%Z#T#o!3V#o$f%Z$f$g&q$g$}%Z$}%O!3V%O%W%Z%W%o!3V%o%p%Z%p&a!3V&a&b%Z&b1p!3V1p4U!3V4U4d!3V4d4e%Z4e$IS!3V$IS$I`%Z$I`$Ib!3V$Ib$Je%Z$Je$Jg!3V$Jg$Kh%Z$Kh%#t!3V%#t&/x%Z&/x&Et!3V&Et&FV%Z&FV;'S!3V;'S;:j!7W;:j?&r%Z?&r?Ah!3V?Ah?BY%Z?BY?Mn!3V?Mn~%Z!a!7cekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a$f%Z$f$g&q$g;=`%Z;=`<%l!3V<%l~%Z!a!9T![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#`9e#`#a!<y#a#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!=Y!ZfQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#U!@{#U#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!A[![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#g9e#g#h!EQ#h#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!Ea![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#g9e#g#h!+V#h#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!If![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#b9e#b#c!+V#c#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a!Mk!^fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#b9e#b#c!+V#c#i9e#i#j##g#j#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a##v![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#h9e#h#i!+V#i#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#'{!^fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#[9e#[#]#+w#]#f9e#f#g#/|#g#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#,W![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#]9e#]#^!EQ#^#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#0]!ZfQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#U#4O#U#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#4_![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#b9e#b#c#8T#c#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#8d![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#g9e#g#h#<Y#h#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#<i![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#]9e#]#^#@_#^#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#@n![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#h9e#h#i#Dd#i#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#Ds![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#]9e#]#^#Hi#^#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!a#Hx![fQkW!f`!hphS`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx}%Z}!O9e!O!P9e!P!Q&q!Q![9e![!]9e!]!^%Z!^!_)Z!_!a&q!a!c%Z!c!}9e!}#R%Z#R#S9e#S#T%Z#T#c9e#c#d!IV#d#o9e#o$f%Z$f$g&q$g$}%Z$}%O9e%O%W%Z%W%o9e%o%p%Z%p&a9e&a&b%Z&b1p9e1p4U9e4U4d9e4d4e%Z4e$IS9e$IS$I`%Z$I`$Ib9e$Ib$Je%Z$Je$Jg9e$Jg$Kh%Z$Kh%#t9e%#t&/x%Z&/x&Et9e&Et&FV%Z&FV;'S9e;'S;:j=d;:j?&r%Z?&r?Ah9e?Ah?BY%Z?BY?Mn9e?Mn~%Z!Z#LyjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst$0}tv#Nkvw$-Zwx$(Ux!P#Nk!P!Q$L}!Q!^#Nk!^!_$+P!_!a$!b!a!b#Nk!b!c%)e!c#o#Nk#o#p%Z#p#q#Nk#q#r%Z#r$f#Nk$f$g$!b$g~#Nk!Z#NvhkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!R$!k_!f`!hp`POr$!brs$#jst&qtv$!bvw$$mwx$(Ux!P$!b!P!Q&q!Q!^$!b!^!_$+P!_#o$!b#o#p&q#p#q$!b#q#r$,i#r~$!bq$#q^!hp`POs$#jst'atv$#jvw$$mwx$%Xx!P$#j!P!Q'a!Q!^$#j!^!_$&g!_#o$#j#o#p'a#p#q$#j#q#r$'l#r~$#jP$$pUOs$$mt!P$$m!Q#o$$m#p#q$$m#q#r$%S#r~$$mP$%XO|PP$%^]`POs$%Xst'wtv$%Xvw$$mw!P$%X!P!Q'w!Q!^$%X!^!_$$m!_#o$%X#o#p'w#p#q$%X#q#r$&V#r~$%XP$&^R|P`POv'ww!^'w!_~'wq$&lZ!hpOs$&gst(Vtv$&gvx$$mx!P$&g!P!Q(V!Q#o$&g#o#p(V#p#q$&g#q#r$'_#r~$&gq$'fQ!hp|POv(Vx~(Vq$'uT!hp|P`POv'awx'wx!^'a!^!_(V!_~'aa$(]^!f``POr$(Urs$%Xst(btv$(Uvw$$mw!P$(U!P!Q(b!Q!^$(U!^!_$)X!_#o$(U#o#p(b#p#q$(U#q#r$*d#r~$(Ua$)^[!f`Or$)Xrs$$mst({tv$)Xvw$$mw!P$)X!P!Q({!Q#o$)X#o#p({#p#q$)X#q#r$*S#r~$)Xa$*ZR!f`|POr({sv({w~({a$*mU!f`|P`POr(brs'wsv(bw!^(b!^!_({!_~(b!R$+W]!f`!hpOr$+Prs$&gst)Ztv$+Pvw$$mwx$)Xx!P$+P!P!Q)Z!Q#o$+P#o#p)Z#p#q$+P#q#r$,P#r~$+P!R$,YT!f`!hp|POr)Zrs(Vsv)Zwx({x~)Z!R$,tV!f`!hp|P`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&qX$-`ekWOX$-ZXZ$$mZ]$-Z]^$$m^p$-Zpq$$mqr$-Zrs$$mst)qtw$-Zwx$$mx!P$-Z!Q!^$-Z!^!a$$m!a#o$-Z#o#p)q#p#q$-Z#q#r$.q#r$f$-Z$f$g$$m$g~$-ZX$.xXkW|POX)qZ])q^p)qqr)qsw)qx!P)q!Q!^)q!a$f)q$g~)q!Z$/rckW!f`!hp|P`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a$f%Z$f$g&q$g~%Z!Z$1YkkW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#T%Z#T#U$2}#U#X%Z#X#Y$C_#Y#]%Z#]#^$HV#^#_%Z#_#`$Is#`$f%Z$f$g&q$g~%Z!Z$3YekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#k%Z#k#l$4k#l$f%Z$f$g&q$g~%Z!Z$4vekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#T%Z#T#U$6X#U$f%Z$f$g&q$g~%Z!Z$6dekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#]%Z#]#^$7u#^$f%Z$f$g&q$g~%Z!Z$8QekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#h%Z#h#i$9c#i$f%Z$f$g&q$g~%Z!Z$9nckW!f`!hp`POX$:yXZ$<gZ]$:y]^$<g^p$:ypq$<gqr$:yrs$=]sv$:yvw)qwx$?ex!P$:y!P!Q$<g!Q!^$:y!^!_)Z!_!a$<g!a$f$:y$f$g$<g$g~$:y!Z$;UekW!f`!hp`POX$:yXZ$<gZ]$:y]^$<g^p$:ypq$<gqr$:yrs$=]sv$:yvw)qwx$?ex!P$:y!P!Q$<g!Q!^$:y!^!_)Z!_!a$<g!a#q$:y#q#r$Ao#r$f$:y$f$g$<g$g~$:y!R$<pX!f`!hp`POr$<grs$=]sv$<gwx$?ex!^$<g!^!_)Z!_#q$<g#q#r$@w#r~$<gq$=dV!hp`POv$=]wx$=yx!^$=]!^!_(V!_#q$=]#q#r$>u#r~$=]P$>OT`POv$=yw!^$=y!_#q$=y#q#r$>_#r~$=yP$>fTzP`POv$=yw!^$=y!_#q$=y#q#r$>_#r~$=yq$?OV!hpzP`POv$=]wx$=yx!^$=]!^!_(V!_#q$=]#q#r$>u#r~$=]a$?lW!f``POr$?ers$=ysv$?ew!^$?e!^!_({!_#q$?e#q#r$@U#r~$?ea$@_W!f`zP`POr$?ers$=ysv$?ew!^$?e!^!_({!_#q$?e#q#r$@U#r~$?e!R$ASX!f`!hpzP`POr$<grs$=]sv$<gwx$?ex!^$<g!^!_)Z!_#q$<g#q#r$@w#r~$<g!Z$A|ekW!f`!hpzP`POX$:yXZ$<gZ]$:y]^$<g^p$:ypq$<gqr$:yrs$=]sv$:yvw)qwx$?ex!P$:y!P!Q$<g!Q!^$:y!^!_)Z!_!a$<g!a#q$:y#q#r$Ao#r$f$:y$f$g$<g$g~$:y!Z$CjekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#T%Z#T#U$D{#U$f%Z$f$g&q$g~%Z!Z$EWekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#V%Z#V#W$Fi#W$f%Z$f$g&q$g~%Z!Z$FtekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#[%Z#[#]$9c#]$f%Z$f$g&q$g~%Z!Z$HbekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#Y%Z#Y#Z$9c#Z$f%Z$f$g&q$g~%Z!Z$JOekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#X%Z#X#Y$Ka#Y$f%Z$f$g&q$g~%Z!Z$KlekW!f`!hp`POX%ZXZ&qZ]%Z]^&q^p%Zpq&qqr%Zrs'asv%Zvw)qwx(bx!P%Z!P!Q&q!Q!^%Z!^!_)Z!_!a&q!a#m%Z#m#n$9c#n$f%Z$f$g&q$g~%Z!R$MW_!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#T&q#T#U$NV#U#X&q#X#Y%$s#Y#]&q#]#^%'T#^#_&q#_#`%'y#`~&q!R$N`X!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#k&q#k#l$N{#l~&q!R% UX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#T&q#T#U% q#U~&q!R% zX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#]&q#]#^%!g#^~&q!R%!pX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#h&q#h#i%#]#i~&q!R%#fX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#q&q#q#r%$R#r~&q!R%$^V!f`!hp{P`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_~&q!R%$|X!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#T&q#T#U%%i#U~&q!R%%rX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#V&q#V#W%&_#W~&q!R%&hX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#[&q#[#]%#]#]~&q!R%'^X!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#Y&q#Y#Z%#]#Z~&q!R%(SX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#X&q#X#Y%(o#Y~&q!R%(xX!f`!hp`POr&qrs'asv&qwx(bx!^&q!^!_)Z!_#m&q#m#n%#]#n~&q!Z%)pmkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#V#Nk#V#W%+k#W#X%3_#X#[#Nk#[#]%;R#]#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%+vjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#c#Nk#c#d%-h#d#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%-sjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#b#Nk#b#c%/e#c#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%/pjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#g#Nk#g#h%1b#h#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%1mjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#h#Nk#h#i#Nk#i#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%3jjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#X#Nk#X#Y%5[#Y#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%5gjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#U#Nk#U#V%7X#V#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%7djkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#i#Nk#i#j%9U#j#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%9ajkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#Z#Nk#Z#[#Nk#[#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%;^jkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#h#Nk#h#i%=O#i#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%=ZjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#a#Nk#a#b%>{#b#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk!Z%?WjkW!f`!hp`POX#NkXZ$!bZ]#Nk]^$!b^p#Nkpq$!bqr#Nkrs$#jst%Ztv#Nkvw$-Zwx$(Ux!P#Nk!P!Q&q!Q!^#Nk!^!_$+P!_!a$!b!a#`#Nk#`#a#Nk#a#o#Nk#o#p%Z#p#q#Nk#q#r$/e#r$f#Nk$f$g$!b$g~#Nk",
  tokenizers: [scriptTokens, styleTokens, textareaTokens, tagStart, commentContent, 0, 1, 2, 3, 4, 5],
  topRules: { "Document": [0, 13] },
  dialects: { noMatch: 0 },
  specialized: [{ term: 16, get: value => spec_Text[value] || -1 }],
  tokenPrec: 533
});

function getAttrs(element, input) {
  let attrs = Object.create(null);
  for (let att of element.firstChild.getChildren("Attribute")) {
    let name = att.getChild("AttributeName"), value = att.getChild("AttributeValue") || att.getChild("UnquotedAttributeValue");
    if (name) attrs[input.read(name.from, name.to)] =
      !value ? "" : value.name == "AttributeValue" ? input.read(value.from + 1, value.to - 1) : input.read(value.from, value.to);
  }
  return attrs
}

function maybeNest(node, input, tags) {
  let attrs;
  for (let tag of tags) {
    if (!tag.attrs || tag.attrs(attrs || (attrs = getAttrs(node.node.parent, input))))
      return { parser: tag.parser }
  }
  return null
}

// tags: {
//   tag: "script" | "style" | "textarea",
//   attrs?: ({[attr: string]: string}) => boolean,
//   parser: Parser
// }[]

function configureNesting(tags) {
  let script = [], style = [], textarea = [];
  for (let tag of tags) {
    let array = tag.tag == "script" ? script : tag.tag == "style" ? style : tag.tag == "textarea" ? textarea : null;
    if (!array) throw new RangeError("Only script, style, and textarea tags can host nested parsers")
    array.push(tag);
  }
  return parseMixed((node, input) => {
    let id = node.type.id;
    if (id == ScriptText) return maybeNest(node, input, script)
    if (id == StyleText) return maybeNest(node, input, style)
    if (id == TextareaText) return maybeNest(node, input, textarea)
    return null
  })
}

export { configureNesting, parser };
