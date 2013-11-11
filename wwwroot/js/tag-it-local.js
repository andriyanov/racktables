suggest_size = 10;

$(document).ready(function() {
	$("input[data-tagit=yes]").each(function (index, value) {
		input = value;
		form = $(input).closest("form");
		ul = $(form).find("ul[data-tagit=yes]")[0];
		preselect = $(ul).data("tagit-preselect");
		value_name = $(ul).data("tagit-valuename") + "[]";
		generateTagList(input, ul, taglist, preselect, value_name);
		// click handler for tag expand
		expand_all = $(form).find("span[class=icon-folder-open]")[0];
		$(expand_all).click(function() {
			e = jQuery.Event('keydown');
			if ($(input)[0].value == "*") {
				e.keyCode = e.which = $.ui.keyCode.ESCAPE;
				$(input).trigger(e);
				$(input).val("");
			}
			else {
				$(input).val("*");
				$(input).focus();
				$(input).autocomplete("search", "*");
			}
		});
	});
});

function generateTagList(input, ul, taglist, preselect, value_name) {
	var tags_name_to_id = [];
	var tags_trace = [];
	var tags_to_name = [];
	var all_tags = [];
	var available_tags = [];
	var selected = [];
	var dynamic_style = $('<style>');

	function getTagChild(tag) {
		result = [];
		if (tag.length == 0) { // empty tag
			for(var k in tags_trace) {
				if (tags_trace[k].length == 0)
					result.push(k);
			};
		}
		else {
			tag_id = tags_name_to_id[tag];
			for(var k in tags_trace) {
				if (tags_trace[k].slice(-1)[0] == tag_id)
					result.push(k);
			};
			if (result.length == 0)
				result.push("no child");
		}
		return result;
	}

	function getHelp(tag) {
		s = [];
		tag_trace = tags_trace[tag];
		for (var k in tag_trace)
		{
			s.push(tags_to_name[tag_trace[k]]);
		}
		result = s.join(" \u2192 "); // right arrow
		return result;
	}

	function generateClass(tag) {
		result = [];
		result.push("tag-" + tags_name_to_id[tag]);
		result.push("etag-" + tags_name_to_id[tag]);
		if (typeof tags_trace[tag] != 'undefined')
		{
			tag_trace = tags_trace[tag];
		}
		else
			tag_trace = [];
		$.each(tag_trace, function (index, value) {result.push("tag-" + value);});
		return result;
	}

	function addHelpTitle(form, help_text) {
		form.attr("title", help_text);
	}

	function afterTagAdded(event, ui) {
		tag = ui.tagLabel;
		tag_id = tags_name_to_id[tag];
		li = ui.tag[0];
		hidded_value = $(li).find("input[value='" + tag + "']")[0]; // replace tag by tag id
		hidded_value.value = tag_id;
		tag_label = $(ui.tag[0]).find(".tagit-label");
		tag_classes = generateClass(tag);
		$.each(tag_classes, function (index, value) {tag_label.addClass(value);});
		// generate title
		r = [];
		r.push(tag_label.attr('title'));
		r.push(getHelp(tag));
		help_text = $.map(r, function (value, index) {if (value.length > 0) {return value;}});
		help_text = help_text.join("\n");
		addHelpTitle(tag_label, help_text);
		//remove tag from available_tags
		available_tags.splice($.inArray(tag, available_tags), 1);
		selected.push(tag);
	}

	function finder(source, req_term) {
		var term = $.ui.autocomplete.escapeRegex(req_term);
		var startsWithMatcher = new RegExp("^" + term, "i");
		var startsWith = $.grep(source, function(value) {
			return startsWithMatcher.test(value.label || value.value || value);
		});
		var containsMatcher = new RegExp(term, "i");
		var contains = $.grep(source, function (value) {
			return $.inArray(value, startsWith) < 0 && containsMatcher.test(value.label || value.value || value);
		});
		return startsWith.concat(contains);
	}

	function suggest (request, response) {
		if (request.term == "*") {
			roots = [];
			tree_styles = {};
			tree_styles[0] = [];
			for (tag in tags_trace)
				if (tags_trace[tag].length == 0) {
					roots.push(tag);
					tree_styles[0].push(tags_name_to_id[tag]);
				}
			changes = 1;
			i = 0;
			taglist_tmp = $.extend(1, taglist);
			$(dynamic_style).appendTo('head');
			while (changes) {
				i++;
				tree_styles[i] = [];
				changes = 0;
				for (tag_id in taglist_tmp)
				{
					if (taglist_tmp[tag_id]['trace'].length == i)
					{
						tag = tags_to_name[tag_id];
						tag_parent_id = taglist[tag_id]['trace'].slice(-1)[0];
						tag_parent = tags_to_name[tag_parent_id];
						index = roots.indexOf(tag_parent);
						roots.splice(index + 1, 0, tag);
						delete taglist_tmp[tag_id];
						tree_styles[i].push(tag_id);
						changes = 1;
					}
				}
			}
			// generate style with indents depended from depth
			for (level in tree_styles) {
				if (tree_styles[level].length == 0)
					continue;
				width = 1 + level * 15;
				class_str = "";
				for (index in tree_styles[level])
					class_str += ".etag-" + tree_styles[level][index] + " a, ";
				dynamic_style.append(class_str.slice(0,-2) + " {margin-left:" + width + "px;}");
				}
			results = roots;
		}
		else if (request.term.slice(-1) == "/" || request.term.slice(-1) == "\\") {
			term = request.term.slice(0,-1);
			if (term.length == 0)
				results = getTagChild("");
			else {
				found_tags = finder(available_tags, term);
				if (found_tags.length == 0) {
					found_tags = finder(all_tags, term);
				}
				results = getTagChild(found_tags[0]);
			}
		}
		else {
			results = finder(available_tags, request.term);
			if (results.length == 0) {
				results = finder(all_tags, request.term);
			}
			results = results.slice(0, suggest_size); // cutting
		}
		response(results);
	};

	function removeClassByPrefix(el, prefix) {
		var regx = new RegExp('\\b' + prefix + '.*?\\b', 'g');
		el.className = el.className.replace(regx, '');
		return el;
	}

	function generateTagDescription(menu) {
		suggest_menu = menu['element'][0];
		for (var i = 0; i < suggest_menu.childElementCount; i++) {
			tag = suggest_menu.children[i].textContent;
			tag_trace = tags_trace[tag];
			help_text = getHelp(tag);
			form = suggest_menu.children[i];
			tag_classes = generateClass(tag);
			if (jQuery.inArray(tag, available_tags) < 0) {
				if (jQuery.inArray(tag, selected) >= 0)
					help_text = "already assigned";
				else
					help_text = "is not assignable";
				tag_classes.push("disabled");
			}
			addHelpTitle($(form), help_text);
			$.each(tag_classes, function (index, value) {$(form).addClass(value);});
		};
	};

	$.each(taglist, function (index, value) {tags_name_to_id[value['tag']] = index;});
	$.each(taglist, function (index, value) {tags_trace[value['tag']] = value['trace'];});
	$.each(taglist, function (index, value) {tags_to_name[index] = value['tag'];});
	$.each(taglist, function (index, value) {all_tags.push(value['tag']);});

	var oldFn = $.ui.autocomplete.prototype._resizeMenu;
	$.ui.autocomplete.prototype._resizeMenu = function() {
		oldFn.apply(this, []);
		var ul = this.menu.element;
		ul.children("li:(.ui-menu-item)").addClass("tagit-menu-item");
	};

	$(ul).tagit({
		fieldName: value_name,
		tagInput: $(input),
		showAutocompleteOnFocus: false,
		removeConfirmation: true,
		caseSensitive: false,
		allowDuplicates: false,
		allowSpaces: true,
		animate: false,
		readOnly: false,
		tagLimit: null,
		singleField: false,
		singleFieldDelimiter: ",",
		singleFieldNode: null,
		backspaceRemove: false,
		tabIndex: null,
		autocomplete: {
							source: suggest,
							search: function(event, ui) {$(dynamic_style).remove();},
							open: function(event, ui) {
								$(this).data("autocomplete").menu.element.addClass("autocomplete-menu");
								generateTagDescription($(this).data("autocomplete").menu);
								var menu_obj = $(this);
								var close_menu = function () {
									menu_obj.data("autocomplete").close();
								};
								// escape handler
								$(document).keydown(function(event) {
									if (event.keyCode == $.ui.keyCode.ESCAPE) {
										close_menu(event);
									}
								});
								$(this).data("autocomplete").close = function (e, ar) {
									if (e && (e.type == "menuselected" || e.keyCode == $.ui.keyCode.ESCAPE || e.keyCode == $.ui.keyCode.BACKSPACE))
										clearTimeout(this.closing), this.menu.element.is(":visible") && (this.menu.element.hide(), this.menu.deactivate(), this._trigger("close", e));
									else
										return false;
								};
							}
		},
		// Events
		beforeTagAdded: function(event, ui) {
			if (jQuery.inArray(ui.tagLabel, available_tags) < 0) { // skip not available tags
				return false;
			}
		},
		afterTagAdded: afterTagAdded,
		afterTagRemoved: function (event, ui) {
			tag_id = ui.tagLabel;
			tag = tags_to_name[tag_id];
			selected.splice($.inArray(tag, selected), 1);
			available_tags.push(tag);
			available_tags.sort();
		},
	});

	$.each(taglist, function (index, value) {if (typeof value["is_assignable"] == "undefined" || value["is_assignable"] == "yes") available_tags.push(value['tag']);});
	$.each(preselect, function(index, value) {$(ul).tagit("createTag", value['tag'], false, false, value['user'] + ", " + value['time_parsed']);});
}
