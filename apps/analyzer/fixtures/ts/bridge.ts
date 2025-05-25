import * as vscode from "vscode";
import { ArtifactPreviewBridgeData, BridgeMessage, ExtractNativeBridgePayload, ExtractNativeBridgeResult, NATIVE_BRIDGE_EVENT_NAME, WEBVIEW_BRIDGE_EVENT_NAME, WebviewBridgeParams } from "../../shared/types/bridge";
import { BaseModule } from "..";
import { ContextManager } from "../context-manager";
import { Webview } from "../webview";
import { ConfigManager, GlobalStateManager, WorkspaceStateManager } from "../state-manager";
import { Config, GlobalState, WorkspaceState } from "../state-manager/types";
import { LoggerManager } from "../logger";
import * as child_process from "child_process";
import { version } from "../../../package.json";
import { open } from "../../utils/openBrowser";
import * as fs from "fs";
import * as os from "os";
import { EditorConfig, InlineChatInfo } from "../../shared/types";
import { ReportKeys, ReportOpt } from "../../shared/types/logger";
import { getAllFilesNonRecursive } from "../../utils/tree";
import { editorConfigs } from "../../utils/getEditorConfig";
import { ExtensionNaviApi, NaviStreamEvent } from "../../services/third-party/navi";
import { LatestCopiedContent, ObservableAPI, toRangeData } from "shared";
import { fromEventEmitter, fromVSCodeEvent, getCurrentFileOrSelection, getVisibilityOfWebviewView } from "./observable";
import { map, Observable, of, shareReplay } from "rxjs";
import { ComposerHistoryStorageService } from "../../services/composer/ComposerHistoryStorageService";
import { ComposerService } from "../../services/composer";
import { DocumentPasteService } from "../../services/composer/DocumentPasteService";
import { IndexFileService } from "../../services/index-file";
import { DeveloperService } from "../../services/developer";
import { MCPService } from "../../services/mcp";
import { RulesService } from "../../services/rules";

export class Bridge extends BaseModule {
  private handlers: Map<string, (data: any) => unknown> = new Map();
  private oneWayMessageHandlers: {
    [key in NATIVE_BRIDGE_EVENT_NAME]?: Set<(data: ExtractNativeBridgePayload<key>, source: vscode.Webview) => void>;
  } = {};

  private callbacks: Map<string, (data: any) => void> = new Map();
  private loggerScope = "bridge";
  private pendingMessages: {
    handlerName: string;
    data: any;
    callback?: (data: any) => void;
  }[];

  private callbackId = 0;
  private webviewReady = false;

  constructor(ext: ContextManager) {
    super(ext);
    this.pendingMessages = [];
    this.registerAllHandlers();

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      this.activeTextChange({
        document: {
          fileName: editor?.document?.fileName ?? "",
          relativePath: vscode.workspace.asRelativePath(editor?.document?.fileName ?? ""),
          languageId: editor?.document.languageId ?? "",
        },
      });
    });
    this.documentPasteService = new DocumentPasteService(ext);
    this.latestCopiedContentObserverable = fromEventEmitter<{
      document: vscode.TextDocument;
      ranges: readonly vscode.Range[];
      dataTransfer: vscode.DataTransfer;
    }>(
      this.documentPasteService.emitter,
      "copy",
    ).pipe(map(raw => ({
      documentUri: raw.document.uri.toString(),
      relativePath: vscode.workspace.asRelativePath(raw.document.uri),
      ranges: raw.ranges.map(range => toRangeData(range)),
      plainText: raw.dataTransfer.get("text/plain")?.value ?? "",
    } satisfies LatestCopiedContent)))
      .pipe(shareReplay(1));
  }

  private getSidePanelWebview() {
    const sidePanelWebview = this.getBase(Webview)._view?.webview;
    if (!sidePanelWebview) {
      throw new Error("side panel webview is not ready");
    }
    return sidePanelWebview;
  }

  private registerAllHandlers() {
    /**
     * webview 初始化完成
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.WEBVIEW_BRIDGE_READY, () => {
      this.logger.info("webview bridge ready", this.loggerScope);
      this.webviewReady = true;
      this.pendingMessages.forEach((message) => {
        this.callHandler(this.getSidePanelWebview(), message.handlerName as WEBVIEW_BRIDGE_EVENT_NAME, message.data, message.callback);
      });
    });

    /**
     * 获取用户信息
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_AND_WATCH_USER_INFO, () => {
      const userInfo = this.globalState.get(GlobalState.USER_INFO);
      this.logger.info(`get user info success: ${userInfo}`, this.loggerScope, {
        value: {
          userInfo,
        },
      });
      this.globalState.watch(GlobalState.USER_INFO, (userInfo) => {
        this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.GET_AND_WATCH_USER_INFO_CALLBACK, userInfo);
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return userInfo!;
    });
    /**
     * 获取编辑区配置
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_AND_WATCH_EDITOR_CONFIG, () => {
      this.context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
          // 检查是否是编辑器配置发生变化
          if (e.affectsConfiguration("editor")
            || e.affectsConfiguration("workbench.colorTheme")) {
            setTimeout(() => {
              this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.GET_AND_WATCH_EDITOR_CONFIG_CALLBACK, editorConfigs);
            }, 0);
          }
        }),
      );

      return editorConfigs;
    });
    /**
     * 获取选中的代码
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_SELECTION_CONTENT, () => {
      const info = this._getSlashCommandActiveTextInfo();
      this.logger.info("get selection content success", this.loggerScope, {
        value: info,
      });
      return info;
    });
    /**
     * 执行命令
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.EXECUTE_CMD, (data?: {
      cmd: string;
    }) => {
      if (!data) {
        return {
          result: "",
        };
      }
      const { cmd } = data;
      try {
        const res = child_process.execSync(cmd, {
          // FIXME: 增大缓存只是临时解决方案 case-buffer-size.md
          maxBuffer: 10 * 1024 * 1024,
        }).toString().trim();
        this.logger.info(`execute cmd success: ${cmd}`, this.loggerScope, {
          value: {
            cmd,
            res,
          },

        });

        return {
          result: res,
        };
      }
      catch (error) {
        this.logger.error("execute cmd error", this.loggerScope, {
          err: error,
        });
        return {
          result: "",
        };
      }
    });

    /**
     * 获取工作区uri
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_WORKSPACE_STORAGE_URI, () => {
      const workspacePath = this.context.storageUri?.toString() ?? "";

      this.logger.info(`get workspace storage uri success: ${workspacePath}`, this.loggerScope, {
        value: workspacePath,
      });
      return {
        result: workspacePath ?? "",
      };
    });

    /**
     * 获取工作区uri
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_WORKSPACE_URI, () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.path;

      this.logger.info(`get workspace uri success: ${workspacePath}`, this.loggerScope, {
        value: workspacePath,
      });
      return {
        result: workspacePath ?? "",
      };
    });
    /**
     * 获取工作区state
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_STATE, (data?: {
      key: WorkspaceState;
    }) => {
      if (!data) {
        return;
      }
      const { key } = data;
      const value = this.workspaceState.get(key, "");
      return {
        value,
      };
    });
    /**
     * 更新工作区state
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.UPDATE_STATE, (data?: {
      key: WorkspaceState;
      value: any;
    }) => {
      if (!data) {
        return;
      }
      const { key, value } = data;
      this.workspaceState.update(key, value);
    });
    /**
     * 文件读取
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.READ_FILE, async (data?: {
      filePath: string;
    }) => {
      if (!data) {
        return;
      }
      const { filePath } = data;
      try {
        const content = await fs.promises.readFile(filePath, "utf8");
        return {
          content,
        };
      }
      catch (error) {
        this.logger.error("read file error", this.loggerScope, {
          err: error,
        });
        return {
          content: "",
        };
      }
    });
    /**
     * 文件状态
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_FILE_STATUS, async (data?: {
      filePath: string;
    }) => {
      if (!data) {
        return;
      }
      const { filePath } = data;
      const status = await fs.promises.stat(filePath);
      return {
        status,
      };
    });
    /**
     * 获取当前文件路径和仓库路径
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_ACTIVE_EDITOR, () => {
      const editor = vscode.window.activeTextEditor;
      const fileName = editor?.document.fileName || "";
      return {
        document: {
          fileName,
          relativePath: vscode.workspace.asRelativePath(fileName ?? ""),
          language: editor?.document.languageId || "",
        },
      };
    });
    /**
     * 获取系统信息
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_SYSTEM_INFO, () => {
      const ideVersion = vscode.version;
      return {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        machine: (os as any).machine(),
        version: (os as any).version(),
        pluginVersion: version,
        ideVersion,
        deviceId: this.globalState.get(GlobalState.DEVICE_ID) || "",
        ide: "kwaipilot-vscode",
      };
    });
    /**
     * 打开url
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.OPEN_URL, (data) => {
      if (!data) {
        return;
      }
      const { url } = data;
      open(url);
    });
    /**
     * 打印日志
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.PRINT_LOGGER, (data: any) => {
      const { level, msg, scope, tags } = data;
      switch (level) {
        case "debug":
          this.logger.debug(msg, scope, tags);
          break;
        case "error":
          this.logger.error(msg, scope, tags);
          break;
        case "info":
          this.logger.info(msg, scope, tags);
          break;
        default:
          this.logger.info(msg, scope, tags);
          break;
      }
    });
    /**
     * 显示toast
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.SHOW_TOAST, (data) => {
      if (!data) {
        return;
      }
      const { message, level } = data;
      if (level === "error") {
        vscode.window.showErrorMessage(message);
      }
      else if (level === "info") {
        vscode.window.showInformationMessage(message);
      }
    });
    /**
     * 获取当前打开的文件
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_OPEN_TAB_FILES, () => {
      return {
        list: this.getOpenTabFiles(),
      };
    });
    /**
     * 获取配置
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.GET_CONFIG, (data) => {
      if (!data) {
        return;
      }
      const { key } = data;
      switch (key) {
        case "enableSummaryConversation":
          return {
            value: this.config.get(Config.ENABLE_SUMMARY_CONVERSATION),
          };
        default:
          return {
            value: "",
          };
      }
    });
    /**
     * 内联聊天消息
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.STREAM_DIFF_MESSAGE, (data) => {
      if (!data) {
        return;
      }
      const { filename, message, autoCreate, autoOpen } = data;
      this.emit(NATIVE_BRIDGE_EVENT_NAME.STREAM_DIFF_MESSAGE, {
        filename,
        message,
        autoCreate,
        autoOpen,
      });
    });
    /**
     * 插入代码
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.CODE_INSERT, (data) => {
      if (!data) {
        return;
      }
      const { content } = data;
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("无法获取当前编辑器，请确保光标位于正确的位置");
        return;
      }

      editor.edit((editBuilder) => {
        // 如果有选中的文本，则替换整个选中区域
        if (!editor.selection.isEmpty) {
          editBuilder.replace(editor.selection, content);
        }
        else {
          // 如果没有选中文本，则在当前位置插入
          editBuilder.insert(editor.selection.active, content);
        }
      }).then((success) => {
        if (!success) {
          vscode.window.showErrorMessage("插入代码失败");
        }
      });
    });
    /**
     * 显示代码diff
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.CODE_DIFF, (data) => {
      if (!data) {
        return;
      }
      // const { content, section, fullPath } = data;
      // vscode.commands.executeCommand(DiffCommands.showDiff, content, section, fullPath);
    });
    /**
     * 采纳/拒绝diff
     */
    // TODO: 历史 bridge ，可以后期删除相关代码
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.ACCEPT_REJECT_DIFF, (data) => {
      if (!data) {
        return;
      }
      const { filepath } = data;
      if (!filepath) {
        // accept ? vscode.commands.executeCommand(DiffCommands.acceptAllFile) : vscode.commands.executeCommand(DiffCommands.rejectAllFile);
      }
      else {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          return;
        }
        // const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, filepath).fsPath;
        // accept ? vscode.commands.executeCommand(DiffCommands.acceptDiff, absolutePath) : vscode.commands.executeCommand(DiffCommands.rejectDiff, absolutePath);
      }
    });
    /**
     * 打开文件到编辑区
     * @param filepath 文件相对工作区的路径
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.OPEN_FILE_TO_EDITOR, (data) => {
      if (!data) {
        return;
      }
      const { filepath, startLine, endLine } = data;
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return;
      }
      const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, filepath).fsPath;
      vscode.workspace.openTextDocument(absolutePath).then((document) => {
        if (startLine !== undefined) {
          // 如果提供了 startLine，则创建一个选择区域或者定位到指定行
          const startPos = new vscode.Position(startLine - 1, 0); // VSCode 行号从 0 开始，而用户输入从 1 开始
          if (endLine !== undefined) {
            // 如果 endline 超过了实际的最后一行，则换为最后一行
            const validEndLine = Math.min(endLine, document.lineCount);
            // 如果同时提供了 endLine，则创建一个选择区域
            const endPos = new vscode.Position(validEndLine - 1, document.lineAt(validEndLine - 1).text.length);
            const selection = new vscode.Selection(startPos, endPos);
            vscode.window.showTextDocument(document, { selection });
          }
          else {
            // 如果只提供了 startLine，则只定位到该行
            const selection = new vscode.Selection(startPos, startPos);
            vscode.window.showTextDocument(document, { selection });
          }
        }
        else {
          // 如果没有提供 startLine，则正常打开文件
          vscode.window.showTextDocument(document);
        }
      });
    });
    /**
     * 打开文件到编辑区
     * @param filepath 文件绝对路径
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.OPEN_FILE_TO_EDITOR_ABSOLUTE_PATH, (data) => {
      if (!data) {
        return;
      }
      const { filepath } = data;
      vscode.workspace.openTextDocument(filepath).then((document) => {
        vscode.window.showTextDocument(document);
      });
    });
    /**
     * 读取目录下所有文件
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.READ_DIRECTORY, async (data) => {
      if (!data) {
        return;
      }
      const { path, options } = data;
      const files = await getAllFilesNonRecursive(path, options.excludes, 1000);
      return {
        files,
      };
    });

    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.CLEAR_INLINE_INFO, () => {
      this.globalState.update(GlobalState.INLINE_CHAT_INFO, undefined);
    });
    /**
     * 在终端中执行命令
     */
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.TERMINAL_SEND_TEXT, (data?: {
      text: string;
    }) => {
      if (!data) {
        return {
          success: false,
          message: "data is undefined",
        };
      }
      const { text } = data;
      try {
        const terminal = vscode.window.createTerminal();
        terminal.show();
        // 处理多行命令，将所有换行替换为分号，这样就不会自动执行
        const commands = text.split("\n").filter(cmd => cmd.trim());
        if (commands.length > 1) {
          // 如果有多个命令，用分号连接并只在最后添加一个换行
          terminal.sendText(commands.join("; "), false);
        }
        else {
          // 单个命令直接发送
          terminal.sendText(text, false);
        }
        return {
          success: true,
        };
      }
      catch (error: any) {
        this.logger.error("execute terminal command error", this.loggerScope, {
          err: error,
        });
        return {
          success: false,
          message: error.message,
        };
      }
    });

    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.ARTIFACT_PREVIEW, async (data?: ArtifactPreviewBridgeData) => {
      if (!data) {
        return;
      }
      const naviExtensionId = "shilin05.ks-navi";

      const provider = data.eventType === "error" || data.eventType === "end" ? data.provider : data.data.provider;
      if (provider === "navi") {
        // 2. 等待预览插件初始化完成并获取通信服务
        const preview = await vscode.extensions.getExtension<ExtensionNaviApi>(naviExtensionId);
        if (!preview) {
          vscode.window.showErrorMessage(`未检测到预览插件${naviExtensionId}`);
          return;
        }
        if (data.eventType === "start") {
          await vscode.commands.executeCommand("navi.openPreview");
        }
        const eventTypeMapper: Record<ArtifactPreviewBridgeData["eventType"], NaviStreamEvent["type"]> = {
          start: "Kwaipilot2Navi-start",
          end: "Kwaipilot2Navi-end",
          error: "Kwaipilot2Navi-error",
          data: "Kwaipilot2Navi-pending",
        };
        const api = await preview.activate();
        const eventPayload: NaviStreamEvent = data.eventType === "start" || data.eventType === "data"
          ? {
              type: eventTypeMapper[data.eventType],
              data: data.data,
            }
          : data.eventType === "error"
            ? {
                type: eventTypeMapper["error"],
                error: data.error,
              }
            : data.eventType === "end"
              ? {
                  type: eventTypeMapper["end"],
                }
              : (undefined as any);
        api.communication.sendStreamEvent(eventPayload);
      }
      else {
        console.log("未知的provider", provider, data);

        vscode.window.showErrorMessage(`未知的provider: ${provider}`);
      }
    });
    this.registerOneWayMessageHandler(NATIVE_BRIDGE_EVENT_NAME.OBSERVABLE_REQUEST, (data, sourceWebview) => {
      if (!data) {
        return;
      }
      if (("streamIdToAbort" in data)) {
        const { streamIdToAbort } = data;
        const abortController = this.observerableActiveListeners.get(streamIdToAbort);
        if (abortController) {
          abortController.abort();
          this.observerableActiveListeners.delete(streamIdToAbort);
        }
      }
      if (!("method" in data)) {
        return;
      }
      const { streamId, method, args } = data;
      if (streamId === undefined) {
        throw new Error("non-AsyncIterator-returning RPC calls are not yet implemented");
      }

      const abortController = new AbortController();
      this.observerableActiveListeners.set(streamId, abortController);

      const methodImpl = this.observerableAPI[method as keyof typeof this.observerableAPI];
      if (!methodImpl) {
        this.observerableActiveListeners.delete(streamId);
        throw new Error(`invalid RPC call for method ${JSON.stringify(method)}`);
      }

      const observable: Observable<unknown> = (methodImpl as any)(...args);
      const subscription = observable.subscribe({
        next: (value) => {
          this.postOneWayMessage(sourceWebview, WEBVIEW_BRIDGE_EVENT_NAME.OBSERVABLE_RESPONSE, {
            streamId,
            streamEvent: "next",
            data: value,
          });
        },
        error: (error) => {
          this.postOneWayMessage(sourceWebview, WEBVIEW_BRIDGE_EVENT_NAME.OBSERVABLE_RESPONSE, {
            streamId,
            streamEvent: "error",
            data: error instanceof Error ? error.message : String(error),
          });
        },
        complete: () => {
          this.postOneWayMessage(sourceWebview, WEBVIEW_BRIDGE_EVENT_NAME.OBSERVABLE_RESPONSE, {
            streamId,
            streamEvent: "complete",
          });
        },
      });
      abortController.signal.addEventListener("abort", () => {
        subscription.unsubscribe();
      });
    });
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.COMPOSER_HISTORY_GET, () => {
      return this.dangerouslyGetService(ComposerHistoryStorageService).getComposerHistory();
    });
    this.registerHandler(NATIVE_BRIDGE_EVENT_NAME.COMPOSER_CLEAR_TASK, () => {
      this.dangerouslyGetService(ComposerService).clearTask();
    });
  }

  observerableActiveListeners: Map<string, Pick<AbortController, "abort">> = new Map();

  getCurrentFileOrSelectionObserverable = getCurrentFileOrSelection().pipe(shareReplay(1));

  getIsDeveloperModeObserverable = fromEventEmitter(
    this.globalState,
    GlobalState.IS_DEVELOPER_MODE,
    () => this.dangerouslyGetService(DeveloperService).$getIsDeveloperMode())
    .pipe(shareReplay(1));

  getIndexStateObserverable = fromEventEmitter(
    this.workspaceState,
    WorkspaceState.INDEX_STATE,
    () => this.indexFileService.$getIndexState())
    .pipe(shareReplay(1));

  getRulesListObserverable = fromEventEmitter(
    this.workspaceState,
    WorkspaceState.RULE_FILE_LIST,
    () => this.rulesService.$getRules()).pipe(shareReplay(1));

  getCurrentThemeObserverable = fromVSCodeEvent(
    vscode.window.onDidChangeActiveColorTheme,
    () => vscode.window.activeColorTheme,
  ).pipe(
    map((theme) => {
      return theme.kind === 1 || theme.kind === 4 ? "light" : "dark";
    }),
    shareReplay(1),
  );

  getMcpServersObserverable = fromEventEmitter(
    this.globalState,
    GlobalState.MCP_SERVERS,
    () => this.mcpService.$getMcpServers())
    .pipe(shareReplay(1));

  getCustomPanelPageObserverable = fromEventEmitter(
    this.workspaceState,
    WorkspaceState.ACTIVE_SETTING_PAGE,
    () => this.workspaceState.get(WorkspaceState.ACTIVE_SETTING_PAGE, "fileIndex"))
    .pipe(shareReplay(1));

  documentPasteService: DocumentPasteService;

  latestCopiedContentObserverable: Observable<LatestCopiedContent | null>;

  private observerableAPI: ObservableAPI = {
    currentFileAndSelection: () => this.getCurrentFileOrSelectionObserverable,
    visibility: () => {
      const view = this.getBase(Webview)._view;
      if (!view) {
        return of(false);
      }
      return getVisibilityOfWebviewView(view);
    },
    currentTheme: () => this.getCurrentThemeObserverable,
    isDeveloperMode: () => this.getIsDeveloperModeObserverable,
    latestCopiedContent: () => this.latestCopiedContentObserverable,
    indexState: () => this.getIndexStateObserverable,
    mcpServers: () => this.getMcpServersObserverable,
    customPanelPage: () => this.getCustomPanelPageObserverable,
    rulesList: () => this.getRulesListObserverable,
  };

  public async getPredictionImage(data: {
    sourceBlockContent: string;
    targetBlockContent: string;
    languageId: string;
    editorConfig: EditorConfig;
  }): Promise<{
      dataUrl: string;
      backgroundColor: string;
    }> {
    return new Promise((resolve) => {
      this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.PREDICTION_IMAGE, data, resolve);
    });
  }

  public activeTextChange(data: {
    document: {
      fileName: string;
      relativePath: string;
      languageId: string;
    };
  }) {
    this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.CHANGE_ACTIVE_TEXT_EDITOR, data);
  }

  public setInlineChat(data?: InlineChatInfo) {
    this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.INLINE_CHAT, data);
  }

  public reportUserAction(data: ReportOpt<keyof ReportKeys>) {
    this.callHandler(this.getSidePanelWebview(), WEBVIEW_BRIDGE_EVENT_NAME.REPORT_USER_ACTION, data);
  }

  private getOpenTabFiles() {
    const rawData = vscode.window.tabGroups.all;
    const tabs: string[] = [];
    rawData.forEach((grow) => {
      const innerTab = grow?.tabs || [];

      const _tabs = innerTab.filter((tab) => {
        if (typeof tab === "string") {
          return false;
        }
        const input = tab?.input as any;
        if (input?.uri?.scheme !== "file") {
          return false;
        }

        return true;
      });
      const formatTab: string[] = _tabs.map((tab) => {
        const input = tab?.input as any;
        const fsPath = input?.uri?.fsPath;
        const k = vscode.workspace.asRelativePath(fsPath);
        return k;
      });
      tabs.push(...formatTab);
    });

    return Array.from(new Set(tabs));
  }

  private _getSlashCommandActiveTextInfo() {
    const editor = vscode.window.activeTextEditor;
    const info = {
      code: "",
      language: "",
      filename: "",
      startLine: 0,
      endLine: 0,
    };

    if (!editor || editor?.document.uri.toString().startsWith("output:")
      || editor?.document.uri.scheme === "comment") {
      return info;
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectedText = document.getText(selection);

    if (!selectedText.trim()) {
      return info;
    }
    info.code = selectedText;
    info.language = document.languageId;
    info.filename = vscode.workspace.asRelativePath(document.fileName);
    info.startLine = selection.start.line;
    info.endLine = selection.end.line;
    this.logger.info("get slash command code info success", this.loggerScope);
    return info;
  }

  // 注册 webview 可以调用的 handler
  registerHandler<T extends NATIVE_BRIDGE_EVENT_NAME>(
    handlerName: T,
    handler: (data?: ExtractNativeBridgePayload<T>) => ExtractNativeBridgeResult<T> | PromiseLike<ExtractNativeBridgeResult<T>>,
  ) {
    const h = (data: string) => {
      try {
        const d = JSON.parse(data) as BridgeMessage;
        return handler(d.payload);
      }
      catch (error) {
        this.logger.error(`call native handler: ${handlerName} error`, this.loggerScope, {
          err: error,
        });
        return handler();
      }
    };
    this.handlers.set(handlerName, h);
  }

  // 返回数据
  async callNativeHandler(webview: vscode.Webview, handlerName: string, data: any, callbackId: string) {
    const handler = this.handlers.get(handlerName);
    if (!handler) {
      this.logger.warn(`Handler not found: ${handlerName}`, this.loggerScope);
      return;
    }

    const startTime = Date.now();
    try {
      const response = await Promise.race([
        handler(data),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Handler timeout")), 300000),
        ),
      ]);

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.warn(`Slow handler execution: ${handlerName}`, this.loggerScope, {
          value: {
            duration,
            data,
            handlerName,
          },
        });
      }

      webview?.postMessage({
        protocol: "callback",
        callbackId,
        data: this.formateResponse(response),
      });
    }
    catch (error: any) {
      this.logger.error(`Handler execution error: ${handlerName}`, this.loggerScope, { err: error });
      // 可以选择发送错误响应
      webview?.postMessage({
        protocol: "callback",
        callbackId,
        data: this.formateResponse(null, 1, error.message),
      });
    }
  }

  // 主动调用 webview 的 handler
  callHandler<T extends WEBVIEW_BRIDGE_EVENT_NAME>(webview: vscode.Webview, handlerName: T, data: WebviewBridgeParams[T], callback?: (data: any) => void) {
    if (!this.webviewReady) {
      this.logger.info("webview bridge not ready", this.loggerScope);
      this.pendingMessages.push({
        handlerName,
        data,
        callback,
      });
      return;
    }
    const callbackId = "native_" + String(this.callbackId++);
    if (callback) {
      this.callbacks.set(callbackId, callback);
    }

    webview.postMessage({
      protocol: "callHandler",
      name: handlerName,
      callbackId,
      data: this.formateResponse(data),
    });
  }

  handleCallback(callbackId: string, data: any) {
    const callback = this.callbacks.get(callbackId);
    if (callback) {
      callback(data);
    }
  }

  postOneWayMessage(webview: vscode.Webview, event: WEBVIEW_BRIDGE_EVENT_NAME, payload: WebviewBridgeParams[WEBVIEW_BRIDGE_EVENT_NAME]) {
    webview.postMessage({
      protocol: "message",
      event,
      payload,
    });
  }

  /**
   * 注册单向信息监听器（没有 response）
   * @param handlerName
   * @param handler
   */
  registerOneWayMessageHandler<T extends NATIVE_BRIDGE_EVENT_NAME>(
    handlerName: T,
    handler: (data: ExtractNativeBridgePayload<T>, source: vscode.Webview) => void,
  ) {
    if (!this.oneWayMessageHandlers[handlerName]) {
      this.oneWayMessageHandlers[handlerName] = new Set<any>();
    }
    this.oneWayMessageHandlers[handlerName].add(handler);
    return () => {
      this.oneWayMessageHandlers[handlerName]?.delete(handler);
    };
  }

  handleOneWayMessage<T extends NATIVE_BRIDGE_EVENT_NAME>(
    webview: vscode.Webview,
    data: { event: T; payload: ExtractNativeBridgePayload<T> },
  ) {
    const handlers = this.oneWayMessageHandlers[data.event];
    if (handlers) {
      handlers.forEach(handler => handler(data.payload, webview));
    }
  }

  private formateResponse(data: any, code?: number, msg?: string) {
    const d = {
      id: this.generateId(),
      code: code ?? 0,
      msg: msg ?? "ok",
      payload: data,
    };
    return JSON.stringify(d);
  }

  // 生成唯一ID
  generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private get globalState() {
    return this.getBase(GlobalStateManager);
  }

  private get logger() {
    return this.getBase(LoggerManager);
  }

  private get workspaceState() {
    return this.getBase(WorkspaceStateManager);
  }

  private get config() {
    return this.getBase(ConfigManager);
  }

  private get indexFileService() {
    return this.dangerouslyGetService(IndexFileService);
  }

  private get mcpService() {
    return this.dangerouslyGetService(MCPService);
  }

  private get rulesService() {
    return this.dangerouslyGetService(RulesService);
  }
}
