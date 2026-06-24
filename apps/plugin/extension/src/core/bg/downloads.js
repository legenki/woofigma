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

/* global browser, fetch, Blob, TextEncoder */

import * as config from "./config.js";
import * as business from "./business.js";
import * as editor from "./editor.js";
import * as ui from "./../../ui/bg/index.js";
import * as woleet from "./../../lib/woleet/woleet.js";
import { download } from "./download-util.js";
import * as yabson from "./../../lib/yabson/yabson.js";
import * as offscreen from "./offscreen.js";

const partialContents = new Map();
const tabData = new Map();
const CONFLICT_ACTION_SKIP = "skip";
const CONFLICT_ACTION_UNIQUIFY = "uniquify";
const REGEXP_ESCAPE = /([{}()^$&.*?/+|[\\\\]|\]|-)/g;

export {
	onMessage,
	downloadPage,
	testSkipSave,
	encodeSharpCharacter
};

async function onMessage(message, sender) {
	if (message.method.endsWith(".download")) {
		return downloadTabPage(message, sender.tab);
	}
	if (message.method.endsWith(".end")) {
		if (message.hash) {
			try {
				await woleet.anchor(message.hash, message.woleetKey);
			} catch (error) {
				ui.onError(sender.tab.id, error.message, error.link);
			}
		}
		business.onSaveEnd(message.taskId);
		return {};
	}
	if (message.method.endsWith(".getInfo")) {
		return business.getTasksInfo();
	}
	if (message.method.endsWith(".cancel")) {
		if (message.taskId) {
			business.cancelTask(message.taskId);
		} else {
			business.cancel(sender.tab.id);
		}
		return {};
	}
	if (message.method.endsWith(".cancelAll")) {
		business.cancelAllTasks();
		return {};
	}
	if (message.method.endsWith(".saveUrls")) {
		business.saveUrls(message.urls);
		return {};
	}
}

async function downloadTabPage(message, tab) {
	const tabId = tab.id;
	let contents;
	if (message.blobURL) {
		try {
			message.url = message.blobURL;
			if (message.compressContent) {
				message.pageData = await yabson.parse(new Uint8Array(await (await fetch(message.blobURL)).arrayBuffer()));
				await downloadCompressedContent(message, tab);
			} else {
				message.content = await (await fetch(message.blobURL)).text();
				await downloadContent(message, tab);
			}
			// eslint-disable-next-line no-unused-vars
		} catch (error) {
			return { error: true };
		} finally {
			try {
				await offscreen.revokeObjectURL(message.blobURL);
				// eslint-disable-next-line no-unused-vars
			} catch (error) {
				// ignored
			}
		}
	} else if (message.compressContent) {
		let parser = tabData.get(tabId);
		if (!parser) {
			parser = yabson.getParser();
			tabData.set(tabId, parser);
		}
		if (message.data) {
			await parser.next(new Uint8Array(message.data));
		} else {
			tabData.delete(tabId);
			const result = await parser.next();
			const message = result.value;
			await downloadCompressedContent(message, tab);
		}
	} else {
		if (message.truncated) {
			contents = partialContents.get(tabId);
			if (!contents) {
				contents = [];
				partialContents.set(tabId, contents);
			}
			contents.push(message.content);
			if (message.finished) {
				partialContents.delete(tabId);
			}
		} else if (message.content) {
			contents = [message.content];
		}
		if (!message.truncated || message.finished) {
			message.content = contents.join("");
			try {
				message.url = await offscreen.getBlobURL(Array.from(new TextEncoder().encode(message.content)), message.mimeType);
				await downloadContent(message, tab);
			} finally {
				try {
					await offscreen.revokeObjectURL(message.url);
					// eslint-disable-next-line no-unused-vars
				} catch (error) {
					// ignored
				}
			}
		}
	}
	return {};
}

async function downloadContent(message, tab) {
	const tabId = tab.id;
	try {
		let skipped;
		if (message.backgroundSave) {
			const testSkip = await testSkipSave(message.filename, message);
			message.filenameConflictAction = testSkip.filenameConflictAction;
			skipped = testSkip.skipped;
		}
		if (skipped) {
			ui.onEnd(tabId);
		} else {
			const prompt = filename => promptFilename(tabId, filename);
			let response;
			if (message.openEditor) {
				ui.onEdit(tabId);
				await editor.open({ tabIndex: tab.index + 1, filename: message.filename, content: message.content, url: message.originalUrl });
			} else if (message.saveToClipboard) {
				await offscreen.saveToClipboard(message.content, message.mimeType);
			} else {
				response = await downloadPage(message, {
					confirmFilename: message.confirmFilename,
					incognito: tab.incognito,
					filenameConflictAction: message.filenameConflictAction,
					filenameReplacementCharacter: message.filenameReplacementCharacter,
					bookmarkId: message.bookmarkId,
					replaceBookmarkURL: message.replaceBookmarkURL,
					includeInfobar: message.includeInfobar,
					openInfobar: message.openInfobar,
					infobarPositionAbsolute: message.infobarPositionAbsolute,
					infobarPositionTop: message.infobarPositionTop,
					infobarPositionBottom: message.infobarPositionBottom,
					infobarPositionLeft: message.infobarPositionLeft,
					infobarPositionRight: message.infobarPositionRight
				});
				if (!response) {
					throw new Error("upload_cancelled");
				}
			}
			ui.onEnd(tabId);
			if (message.openSavedPage && !message.openEditor) {
				const createTabProperties = { active: true, url: "/src/ui/pages/viewer.html?blobURI=" + message.url };
				if (tab.index != null) {
					createTabProperties.index = tab.index + 1;
				}
				browser.tabs.create(createTabProperties);
			}
		}
	} catch (error) {
		if (!error.message || error.message != "upload_cancelled") {
			console.error(error); // eslint-disable-line no-console
			ui.onError(tabId, error.message, error.link);
		}
	} finally {
		if (!message.openSavedPage && message.url) {
			try {
				await offscreen.revokeObjectURL(message.url);
				// eslint-disable-next-line no-unused-vars
			} catch (error) {
				// ignored
			}
		}
	}
}

async function downloadCompressedContent(message, tab) {
	const tabId = tab.id;
	let blobURI;
	try {
		const prompt = filename => promptFilename(tabId, filename);
		let skipped, response;
		if (message.backgroundSave && !message.foregroundSave) {
			const testSkip = await testSkipSave(message.filename, message);
			message.filenameConflictAction = testSkip.filenameConflictAction;
			skipped = testSkip.skipped;
		}
		if (skipped) {
			ui.onEnd(tabId);
		} else {
			blobURI = await offscreen.compressPage(message.pageData, {
				insertTextBody: message.insertTextBody,
				url: message.pageData.url || tab.url,
				createRootDirectory: message.createRootDirectory,
				tabId,
				selfExtractingArchive: message.selfExtractingArchive,
				disableCompression: message.disableCompression,
				extractDataFromPage: message.extractDataFromPage,
				preventAppendedData: message.preventAppendedData,
				insertCanonicalLink: message.insertCanonicalLink,
				insertMetaNoIndex: message.insertMetaNoIndex,
				insertMetaCSP: message.insertMetaCSP,
				password: message.password,
				embeddedImage: message.embeddedImage
			});
			if (message.openEditor) {
				ui.onEdit(tabId);
				const content = Array.from(new Uint8Array(await (await fetch(blobURI)).arrayBuffer()));
				await editor.open({
					tabIndex: tab.index + 1,
					filename: message.filename,
					content,
					compressContent: message.compressContent,
					selfExtractingArchive: message.selfExtractingArchive,
					disableCompression: message.disableCompression,
					extractDataFromPage: message.extractDataFromPage,
					insertTextBody: message.insertTextBody,
					insertMetaCSP: message.insertMetaCSP,
					embeddedImage: message.embeddedImage,
					url: message.originalUrl
				});
			} else if (message.foregroundSave) {
				const blob = (await fetch(blobURI)).blob();
				await downloadPageForeground(message.taskId, message.filename, blob, message.pageData.mimeType, tabId, {
					foregroundSave: message.foregroundSave
				});
			} else {
				if (message.backgroundSave) {
					message.url = blobURI;
					response = await downloadPage(message, {
						confirmFilename: message.confirmFilename,
						incognito: tab.incognito,
						filenameConflictAction: message.filenameConflictAction,
						filenameReplacementCharacter: message.filenameReplacementCharacter,
						bookmarkId: message.bookmarkId,
						replaceBookmarkURL: message.replaceBookmarkURL,
						includeInfobar: message.includeInfobar,
						openInfobar: message.openInfobar,
						infobarPositionAbsolute: message.infobarPositionAbsolute,
						infobarPositionTop: message.infobarPositionTop,
						infobarPositionBottom: message.infobarPositionBottom,
						infobarPositionLeft: message.infobarPositionLeft,
						infobarPositionRight: message.infobarPositionRight
					});
				} else {
					const blob = await (await fetch(blobURI)).blob();
					await downloadPageForeground(message.taskId, message.filename, blob, message.mimeType, tabId);
				}
			}
			ui.onEnd(tabId);
			if (message.openSavedPage && !message.openEditor) {
				const createTabProperties = { active: true, url: "/src/ui/pages/viewer.html?compressed&blobURI=" + blobURI, windowId: tab.windowId };
				if (tab.index != null) {
					createTabProperties.index = tab.index + 1;
				}
				browser.tabs.create(createTabProperties);
			}
		}
	} catch (error) {
		if (!error.message || error.message != "upload_cancelled") {
			console.error(error); // eslint-disable-line no-console
			ui.onError(tabId, error.message, error.link);
		}
	} finally {
		if (!message.openSavedPage && blobURI) {
			try {
				await offscreen.revokeObjectURL(blobURI);
				// eslint-disable-next-line no-unused-vars
			} catch (error) {
				// ignored
			}
		}
	}
}

function encodeSharpCharacter(path) {
	return path.replace(/#/g, "%23");
}

function getRegExp(string) {
	return string.replace(REGEXP_ESCAPE, "\\$1");
}

async function testSkipSave(filename, options) {
	let skipped, filenameConflictAction = options.filenameConflictAction;
	if (filenameConflictAction == CONFLICT_ACTION_SKIP) {
		const downloadItems = await browser.downloads.search({
			filenameRegex: "(\\\\|/)" + getRegExp(filename) + "$",
			exists: true
		});
		if (downloadItems.length) {
			skipped = true;
		} else {
			filenameConflictAction = CONFLICT_ACTION_UNIQUIFY;
		}
	}
	return { skipped, filenameConflictAction };
}

function promptFilename(tabId, filename) {
	return browser.tabs.sendMessage(tabId, { method: "content.prompt", message: "Filename conflict, please enter a new filename", value: filename });
}

async function downloadPage(pageData, options) {
	const downloadInfo = {
		url: pageData.url,
		saveAs: options.confirmFilename,
		filename: pageData.filename,
		conflictAction: options.filenameConflictAction
	};
	if (options.incognito) {
		downloadInfo.incognito = true;
	}
	const downloadData = await download(downloadInfo, options.filenameReplacementCharacter);
	if (downloadData.filename) {
		let url = downloadData.filename;
		if (!url.startsWith("file:")) {
			if (url.startsWith("/")) {
				url = url.substring(1);
			}
			url = "file:///" + encodeSharpCharacter(url);
		}
		return { url };
	}
}

async function downloadPageForeground(taskId, filename, content, mimeType, tabId, { foregroundSave } = {}) {
	const serializer = yabson.getSerializer({
		filename,
		taskId,
		foregroundSave,
		content: await content.arrayBuffer(),
		mimeType
	});
	for await (const data of serializer) {
		await browser.tabs.sendMessage(tabId, {
			method: "content.download",
			data: Array.from(data)
		});
	}
	return browser.tabs.sendMessage(tabId, { method: "content.download" });
}