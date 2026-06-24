/*
 * Copyright 2010-2020 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of SingleFile.
 *
 *   The code in this file is free software: you can redistribute it and/or 
 *   modify it under the terms of the GNU Affero General Public License 
 *   (GNU AGPL) as published by the Free Software Foundation, either version 3
 *   of the License, or (at your option) any later version.
 * 
 *   The code in this file is distributed in the hope that it will be useful, 
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of 
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero 
 *   General Public License for more details.
 *
 *   As additional permission under GNU AGPL version 3 section 7, you may 
 *   distribute UNMODIFIED VERSIONS OF THIS file without the copy of the GNU 
 *   AGPL normally required by section 4, provided you include this license 
 *   notice and a URL through which recipients can access the Corresponding 
 *   Source.
 */

/* global browser, URL */

import * as config from "./../../core/bg/config.js";
import { queryTabs } from "./../../core/bg/tabs-util.js";
import * as tabsData from "./../../core/bg/tabs-data.js";

import { refreshAutoSaveTabs } from "./../../core/bg/autosave-util.js";
import * as button from "./ui-button.js";

const menus = browser.contextMenus;
const MENU_ID_SAVE_PAGE = "save-page";
const MENU_ID_EDIT_AND_SAVE_PAGE = "edit-and-save-page";
const MENU_ID_SAVE_WITH_PROFILE = "save-with-profile";
const MENU_ID_SAVE_SELECTED_LINKS = "save-selected-links";
const MENU_ID_VIEW_PENDINGS = "view-pendings";
const MENU_ID_SELECT_PROFILE = "select-profile";
const MENU_ID_SAVE_WITH_PROFILE_PREFIX = "wasve-with-profile-";
const MENU_ID_SELECT_PROFILE_PREFIX = "select-profile-";
const MENU_ID_ASSOCIATE_WITH_PROFILE = "associate-with-profile";
const MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX = "associate-with-profile-";
const MENU_ID_SAVE_SELECTED = "save-selected";
const MENU_ID_SAVE_FRAME = "save-frame";
const MENU_ID_SAVE_TABS = "save-tabs";
const MENU_ID_SAVE_SELECTED_TABS = "save-selected-tabs";
const MENU_ID_SAVE_UNPINNED_TABS = "save-unpinned-tabs";
const MENU_ID_SAVE_ALL_TABS = "save-all-tabs";
const MENU_ID_BATCH_SAVE_URLS = "batch-save-urls";
const MENU_ID_BUTTON_SAVE_SELECTED_TABS = "button-" + MENU_ID_SAVE_SELECTED_TABS;
const MENU_ID_BUTTON_SAVE_UNPINNED_TABS = "button-" + MENU_ID_SAVE_UNPINNED_TABS;
const MENU_ID_BUTTON_SAVE_ALL_TABS = "button-" + MENU_ID_SAVE_ALL_TABS;
const MENU_ID_AUTO_SAVE = "auto-save";
const MENU_ID_AUTO_SAVE_DISABLED = "auto-save-disabled";
const MENU_ID_AUTO_SAVE_TAB = "auto-save-tab";
const MENU_ID_AUTO_SAVE_UNPINNED = "auto-save-unpinned";
const MENU_ID_AUTO_SAVE_ALL = "auto-save-all";
const MENU_CREATE_DOMAIN_RULE_MESSAGE = browser.i18n.getMessage("menuCreateDomainRule");
const MENU_UPDATE_RULE_MESSAGE = browser.i18n.getMessage("menuUpdateRule");
const MENU_SAVE_PAGE_MESSAGE = browser.i18n.getMessage("menuSavePage");
const MENU_SAVE_WITH_PROFILE = browser.i18n.getMessage("menuSaveWithProfile");
const MENU_SAVE_SELECTED_LINKS = browser.i18n.getMessage("menuSaveSelectedLinks");
const MENU_EDIT_PAGE_MESSAGE = browser.i18n.getMessage("menuEditPage");
const MENU_EDIT_AND_SAVE_PAGE_MESSAGE = browser.i18n.getMessage("menuEditAndSavePage");
const MENU_VIEW_PENDINGS_MESSAGE = browser.i18n.getMessage("menuViewPendingSaves");
const MENU_SAVE_SELECTION_MESSAGE = browser.i18n.getMessage("menuSaveSelection");
const MENU_SAVE_FRAME_MESSAGE = browser.i18n.getMessage("menuSaveFrame");
const MENU_SAVE_TABS_MESSAGE = browser.i18n.getMessage("menuSaveTabs");
const MENU_SAVE_SELECTED_TABS_MESSAGE = browser.i18n.getMessage("menuSaveSelectedTabs");
const MENU_SAVE_UNPINNED_TABS_MESSAGE = browser.i18n.getMessage("menuSaveUnpinnedTabs");
const MENU_SAVE_ALL_TABS_MESSAGE = browser.i18n.getMessage("menuSaveAllTabs");
const MENU_BATCH_SAVE_URLS_MESSAGE = browser.i18n.getMessage("menuBatchSaveUrls");
const MENU_SELECT_PROFILE_MESSAGE = browser.i18n.getMessage("menuSelectProfile");
const PROFILE_DEFAULT_SETTINGS_MESSAGE = browser.i18n.getMessage("profileDefaultSettings");
const MENU_AUTOSAVE_MESSAGE = browser.i18n.getMessage("menuAutoSave");
const MENU_AUTOSAVE_DISABLED_MESSAGE = browser.i18n.getMessage("menuAutoSaveDisabled");
const MENU_AUTOSAVE_TAB_MESSAGE = browser.i18n.getMessage("menuAutoSaveTab");
const MENU_AUTOSAVE_UNPINNED_TABS_MESSAGE = browser.i18n.getMessage("menuAutoSaveUnpinnedTabs");
const MENU_AUTOSAVE_ALL_TABS_MESSAGE = browser.i18n.getMessage("menuAutoSaveAllTabs");
const MENU_TOP_VISIBLE_ENTRIES = [
	MENU_ID_EDIT_AND_SAVE_PAGE,
	MENU_ID_SAVE_SELECTED_LINKS,
	MENU_ID_SAVE_SELECTED,
	MENU_ID_SAVE_FRAME,
	MENU_ID_AUTO_SAVE,
	MENU_ID_ASSOCIATE_WITH_PROFILE
];

const menusCheckedState = new Map();
const menusTitleState = new Map();
let contextMenuVisibleState = true;
let allMenuVisibleState = true;
let profileIndexes = new Map();
let menusCreated, pendingRefresh, business;
Promise.resolve().then(initialize);
export {
	onMessage,
	refreshTab as onTabCreated,
	refreshTab as onTabActivated,
	refreshTab as onInit,
	createMenus as refreshTab,
	init
};

function init(businessApi) {
	business = businessApi;
}

function onMessage() {
	return Promise.resolve({});
}

async function createMenus() {
	// Context menu is disabled
}

async function initialize() {
	try {
		await browser.contextMenus.removeAll();
	} catch (error) {
		// ignored
	}
}

async function refreshTab() {
	// Context menu is disabled
}