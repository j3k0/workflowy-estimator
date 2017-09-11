/*! workflowy-estimator v0.3.0 by jchoelt */
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version, with the following exception:
// the text of the GPL license may be omitted.
//
// This program is distributed in the hope that it will be useful, but
// without any warranty; without even the implied warranty of
// merchantability or fitness for a particular purpose. Compiling,
// interpreting, executing or merely reading the text of the program
// may result in lapses of consciousness and/or very being, up to and
// including the end of all existence and the Universe as we know it.
// See the GNU General Public License for more details.
//
// You may have received a copy of the GNU General Public License along
// with this program (most likely, a file named COPYING).  If not, see
// <https://www.gnu.org/licenses/>.
//
/*global window */
/*jslint browser:true, white:true*/

(function () {

  'use strict';

  // Need to fire once on load
  // Since the 'focusin' event doesn't happen right away
  window.addEventListener('load', function () {
      setup();
  });

  window.addEventListener('focusin', debounce(setup, 3000, {
      leading: true,
      trailing: true
  }));

  // Range helper functions

  const zero = [0, 0];

  function sumRanges(a, b) {
      return [
          a[0] + b[0],
          a[1] + b[1]
      ]
  }

  function roundNumber(n) {
      if (n > 5000)
          return Math.round(n / 500) * 500;
      else if (n > 2000)
          return Math.round(n / 100) * 100;
      else if (n > 500)
          return Math.round(n / 50) * 50;
      else if (n > 200)
          return Math.round(n / 10) * 10;
      else if (n > 50)
          return Math.round(n / 5) * 5;
      else
          return Math.round(n);
  }

  function formatRange(quote) {
      if (quote[0] == quote[1])
          return '$' + roundNumber(quote[0]);
      else {
          const avg = Math.round(quote[0] + quote[1]) / 2;
          const diff = Math.round(quote[1] - quote[0]) / 2;
          return '$' + roundNumber(avg) + ' <span style="font-size: 10px">+/- $' + roundNumber(diff) + "</span>";
      }
  }

  function isRange(text) {
      return text.match(/\$[0-9]+\.\.[0-9]+/);
  }

  function safeParse(i) {
      const v = +i;
      return isFinite(v) ? v : 0;
  }

  // Gaussian helper functions

  function gaussian_rand() {
    var rand = 0;
    for (var i = 0; i < 6; i += 1) {
      rand += Math.random();
    }
    return rand / 6;
  }

  // Workflowy DOM

  function nodeText(el) {
      return el.children(".name").children(".content");
  }

  function nodeChildren(el) {
      return el.children(".children").children(".project");
  }

  // Quotes parsing :
  // Accumulate all estimates in a tree

  function self_quote(el) {
      const text = nodeText(el).text();
      const token = text.split(" ")[0];
      if (token.match(/^\$[0-9]+/)) {
          if (isRange(token)) {
              const s = token.slice(1).split(".");
              return [
                  safeParse(s[0]),
                  safeParse(s[2])
              ];
          }
          else {
              const val = safeParse(text.split(" ")[0].slice(1));
              return [val, val];
          }
      }
      return null;
  }

  function children_quote(el) {
      let total = [0, 0];
      const children = nodeChildren(el);
      for (let i = 0; i < children.length; ++i)
          total = sumRanges(total, total_quote_0($(children[i])));
      return total;
  }

  function list_children_quotes(el) {
      let all = [];
      const children = nodeChildren(el);
      for (let i = 0; i < children.length; ++i)
          all = all.concat(list_quotes($(children[i])));
      return all;
  }

  function list_quotes(el) {
      const self = self_quote(el);
      if (self)
          return [self];
      else
          return list_children_quotes(el);
  }

  function total_quote_0(el) {
      const self = self_quote(el);
      if (self)
          return self;
      else
          return children_quote(el);
  }

  function sum_quotes_gaussian(list) {
      let total = 0;
      for (let i = 0; i < list.length; ++i) {
          const a = list[i][0];
          const b = list[i][1];
          if (a == b)
              total += a;
          else {
              let d = 0.5 * (b - a);
              let ad = a - d;
              total += ad + gaussian_rand() * (b + d - ad);
          }
      }
      return total;
  }

  const CONFIDENCE_OFFSET = 10;

  function many_gaussians(list, n) {
      let all = [];
      for (let i = 0; i < n; ++i)
          all.push(+sum_quotes_gaussian(list));
      all = all.sort(function(a,b) {
          return a - b;
      });
      return all;
  }

  function total_quote_1(el) {
      const list = list_children_quotes(el);
      let all = many_gaussians(list, 1000);
      // console.log(many_gaussians(list, 10));
      return [
          all[0 + CONFIDENCE_OFFSET],
          all[999 - CONFIDENCE_OFFSET]
      ];
  }

  // Find nodes for which quotes have been requested

  const total_quote = total_quote_1;

  function propagate_quote_into(el) {
      const quote = total_quote(el);
      if (quote[0] != 0 || quote[1] != 0) {
          const text = formatRange(quote);
          el.prepend($('<div class="quote" style="color:blue; text-align:right"><!--span style="font-size: 12px">Total:</span--> ' + text + '</div>'));
          el.children(".quote").click(function() {
              setup();
          });
      }
  }

  function find_quote(el) {
      const text = nodeText(el).text();
      if (text.match(/\$\$\$/) && !el.hasClass("parent")) {
          propagate_quote_into(el);
      }
      const children = nodeChildren(el);
      for (let i = 0; i < children.length; ++i)
          find_quote($(children[i]));
  }

  // Extension setup

  function setup_main_button() {

      if (!window.$) return;
      const el = $(".mainTreeRoot");
      if (!el) return;
      if (el.children(".quote").length > 0)
          return;

      el.prepend($('<a class="quote" style="display: block; color:blue; text-align:right; font-size: 10px; text-decoration: underline">Refresh Estimates</a>'));
      el.children(".quote").click(function(e) {
          e.preventDefault();
          setup();
      });
  }

  function setup() {

      if (!window.$) return;
      const el = $(".mainTreeRoot");
      if (!el) return;

      $(".quote", el).remove();
      setup_main_button();

      find_quote(el);
  }

  // setup();

}());
