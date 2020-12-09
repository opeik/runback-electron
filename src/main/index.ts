import { app, BrowserWindow } from "electron"
import { ChildProcess, fork } from "child_process"
import path from "path"

const main_url =
  "http://localhost:9090/bundles/runback/dashboard/runback.html?standalone=true/#/"
const loading_url = path.join(
  "file://",
  process.resourcesPath,
  "lib/nodecg/bundles/runback/dashboard/loading.html"
)
const main_load_delay = 10 * 1000
const background_color = "#0f0f0f"
const nodecg_path = "lib/nodecg"

app.on("ready", () => {
  if (!app.isPackaged) {
    require("vue-devtools").install()
  }

  let main: BrowserWindow
  let dummy: BrowserWindow
  let loading = create_loading_window()
  let nodecg_process: ChildProcess

  nodecg_process = fork("index.js", undefined, {
    cwd: nodecg_path,
    env: { ELECTRON_RUN_AS_NODE: "1" },
  })

  log(`Started nodecg, pid: ${nodecg_process.pid}`)

  loading.webContents.on("dom-ready", () => {
    log("Loading window ready")
    loading.show()
    main = create_main_window()
    dummy = create_main_window()

    // It Just Works™. This is an **awful** hack. For some reason there's a
    // period after NodeCG starts where pages won't load. Delaying the load,
    // then reloading the page appears to deal with this.
    dummy.once("ready-to-show", () => {
      log("Dummy window ready")
      dummy.close()
      main.loadURL(main_url)
    })

    setTimeout(() => {
      dummy.loadURL(main_url)
    }, main_load_delay)

    main.once("ready-to-show", () => {
      log("Main window ready")
      main.show()

      if (!loading.isDestroyed()) {
        loading.close()
      }
    })
  })

  loading.loadURL(loading_url)

  // Kill the process if all the windows are closed.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  // Stay open on macOS.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      main = create_main_window()

      main.once("ready-to-show", () => {
        main.show()
      })

      main.loadURL(main_url)
    }
  })
})

function create_main_window(): BrowserWindow {
  let window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: "Runback",
    backgroundColor: background_color,
    webPreferences: {
      nodeIntegration: true,
    },
  })

  window.setMenuBarVisibility(false)

  window.on("page-title-updated", (evt: Event) => {
    evt.preventDefault()
  })

  window.webContents.on("will-navigate", (event: Event, link: string) => {
    event.preventDefault()
  })

  return window
}

function create_loading_window(): BrowserWindow {
  let window = new BrowserWindow({
    show: false,
    frame: false,
    resizable: false,
    width: 300,
    height: 300,
    title: "Runback",
    backgroundColor: background_color,
  })

  window.on("page-title-updated", (event: Event) => {
    event.preventDefault()
  })

  return window
}

function log(...args: any): void {
  console.log(`[runback-electron] ${args}`)
}
