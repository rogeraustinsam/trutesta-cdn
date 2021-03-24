
(function() {

	window.Helper = {
		_TestFolder: 'qtest_' + (new Date().getTime()) + '/',
		_Folders: {},
		_Files: {},

		/**
		 *
		 * @param sRelativePath
		 * @returns {string}
		 */
		GetPath: function(sRelativePath) {
			return '/' + this._TestFolder + sRelativePath;
		},

		/**
		 *
		 * @param sRelativePath
		 * @returns {string}
		 */
		GetAbsolutePath: function(sRelativePath) {
			return this._GetHost() + this.GetPath(sRelativePath).substr(1);
		},

		GetSession: function() {
			return window.webDavSession;
		},

		GetFolder: function(sPath, fCallback) {
			var that = this;

			if (this._Folders[sPath]) {
				setTimeout(function() {
					fCallback(that._Folders[sPath]);
				});
				return;
			}

			var sAbsolutePath = this._GetHost() + sPath.substr(1);

			this.GetSession().OpenFolderAsync(sAbsolutePath, null, function(oAsyncResult) {
				that._Folders[sPath] = oAsyncResult.Result;
				fCallback(oAsyncResult.Result);
			});
		},

		Create: function(aPaths, fCallback) {
			this._CreateNext(aPaths, 0, fCallback);
		},

		_CreateNext: function(aPaths, i, fCallback) {
			var sPath = aPaths[i];

			if (!sPath) {
				fCallback();
				return;
			}

			var that = this;
			if (/\/$/.test(sPath)) {
				this._CreateFolder(sPath, function() {
					that._CreateNext(aPaths, i + 1, fCallback);
				});
			} else {
				this._CreateFile(sPath, function() {
					that._CreateNext(aPaths, i + 1, fCallback);
				});
			}
		},

		CheckVersionsSupported: function(oFile, fCallback) {
			oFile.SupportedFeaturesAsync(function(oAsyncResult) {

				/** @typedef {ITHit.WebDAV.Client.OptionsInfo} oOptionsInfo */
				var oOptionsInfo = oAsyncResult.Result;

				if ((oOptionsInfo.VersionControl & ITHit.WebDAV.Client.Features.VersionControl) === 0) {
					fCallback(false);
					return;
				}

				if (oFile.VersionControlled) {
					fCallback(true);
					return;
				}

				oFile.PutUnderVersionControlAsync(true, null, function(oAsyncResult) {
					fCallback(oAsyncResult.IsSuccess);
				});
			});
		},

		_GetHost: function() {
			return window.ITHitTestsConfig.Url.replace(/\/?$/, '/');
		},

		/**
		 *
		 * @param sPath
		 * @param fCallback
		 * @private
		 */
		_CreateFolder: function(sPath, fCallback) {
			var folders = this.GetPath(sPath).split('/');
			folders.shift();

			var that = this;
			setTimeout(function() {
				that._CreateFolderNext(folders, '', 0, fCallback);
			});
		},

		_CreateFolderNext: function(folders, sParentFolder, i, fCallback) {
			if (!folders[i]) {
				fCallback();
				return;
			}

			var sFolder = sParentFolder + folders[i] + '/';

			if (this._Folders[sFolder]) {
				this._CreateFolderNext(folders, sFolder, i + 1, fCallback);
			} else {
				var that = this;
				this.GetFolder(sParentFolder || '/', function(oFolder) {
					oFolder.CreateFolderAsync(folders[i] + '/', null, null, function(oAsyncResult) {
						that._Folders[sFolder] = oAsyncResult.Result;
						that._CreateFolderNext(folders, sFolder, i + 1, fCallback);
					});
				});
			}
		},

		/**
		 *
		 * @param sPath
		 * @param fCallback
		 * @private
		 */
		_CreateFile: function(sPath, fCallback) {
			var matches = /(.+\/)?([^/]+)$/.exec(sPath)
			var folderRelative = matches[1] || '';
			var file = matches[2];
			var folder = this.GetPath(folderRelative);

			if (folderRelative) {
				var that = this;
				this._CreateFolder(folderRelative, function() {
					that._CreateFileItem(folder, file, fCallback);
				});
			} else {
				this._CreateFileItem(folder, file, fCallback);
			}
		},

		_CreateFileItem: function(folder, file, fCallback) {
			if (this._Files[folder + file]) {
				setTimeout(function() {
					fCallback();
				});
				return;
			}

			var that = this;
			this.GetFolder(folder, function(oFolder) {
				oFolder.CreateFileAsync(file, null, 'test..', null, function(oAsyncResult) {
					that._Files[folder + file] = oAsyncResult.Result;
					fCallback();
				});
			});
		},

		Destroy: function() {
			this.GetFolder(this._TestFolder, function(oFolder) {
				oFolder.DeleteAsync(null, function() {
					// ok
				});
			});
		}
	};

})();