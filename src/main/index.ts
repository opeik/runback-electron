import { app, BrowserWindow } from "electron"
import { ChildProcess, fork } from "child_process"
import path from "path"

const background_color = "#0f0f0f"
const nodecg_path = path.join(process.resourcesPath, "lib/nodecg")
const main_load_delay = 10 * 1000
const main_url =
  "http://localhost:9090/bundles/runback/dashboard/runback.html?standalone=true/#/"
const loading_url = path.join(
  "file://",
  process.resourcesPath,
  "lib/nodecg/bundles/runback/dashboard/loading.html"
)

app.on("ready", () => {
  if (!app.isPackaged) {
    require("vue-devtools").install()
  }

  let main: BrowserWindow = create_main_window()
  let loading = create_loading_window()
  let nodecg_process: ChildProcess
  loading.loadURL(loading_url)

  nodecg_process = fork("index.js", undefined, {
    detached: false,
    cwd: nodecg_path,
    env: { ELECTRON_RUN_AS_NODE: "1" },
  })

  log(`Started nodecg, pid: ${nodecg_process.pid}`)

  loading.once("ready-to-show", () => {
    log("Loading window ready")
    loading.show()

    // It Just Works™. This is an **awful** hack. For some reason there's a
    // period after NodeCG starts where pages won't load. Delaying the load
    // appears to deal with this.
    setTimeout(() => {
      main.loadURL(main_url)
    }, main_load_delay)

    main.once("ready-to-show", () => {
      main.show()

      if (!loading.isDestroyed()) {
        loading.close()
      }
    })
  })

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

  // Kill NodeCG on exit.
  process.on("exit", () => {
    nodecg_process.kill()
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
