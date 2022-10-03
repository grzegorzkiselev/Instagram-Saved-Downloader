class Controls {
  constructor() {
    this.title = document.querySelector(".title")
    this.intro = document.querySelector(".intro")
    this.startButton = document.querySelector("[data-start]")
    this.downloadButton = document.querySelector("[data-download]")
    this.deselectAllButton = document.querySelector("[data-deselect-all]")
    this.loadingContainer = document.querySelector("#loading-container")
    this.loadingIndicator = document.querySelector("#loading-indicator")
    this.authorCardContainer = document.querySelector("[data-author-card-container]")
    this.authorCard = document.querySelector("[data-author-card]"),
    this.canvas = document.querySelector("canvas")
  }
}

class State {
  constructor(controls) {
    this.state = "FULL_COLLECTION_UI_STATE"
    this.lastState = undefined
    this.currentInstagramTabId = this.currentInstagramTabId
    this.preloaderIsShown = false
    this.isRunning = false
    this.isCursorPressed = false
    this.shouldBeChecked = false
    this.controls = controls
    this.allCheckboxesList = undefined

    this.Checkbox = class {
      constructor(event) {
        this.controls = new Controls()
        this.parent = event.target.closest(".author-card")
        this.imageSelector = event.target.closest(".image-selector")
        this.usernameSelector = event.target.closest(".username-selector")

        if (this.imageSelector) {
          this.checkbox = this.imageSelector.querySelector(".image-checkbox")
          this.checkboxState = this.checkbox.checked
          this.usernameCheckbox = this.parent.querySelector(".username-checkbox")
        } else if (this.usernameSelector) {
          this.checkbox = this.usernameSelector.querySelector(".username-checkbox")
          this.checkboxState = this.checkbox.checked
          this.usernameChildrenCheckboxesList = Array.from(this.parent.querySelectorAll(".image-checkbox"))
        }
      }
      setCheckboxState(state) {
        this.checkbox.checked = state
      }
      checkAll(list) {
        list.map((checkbox) => {
          checkbox.checked = true
        })
      }
      uncheckAll(list) {
        list.map((checkbox) => {
          checkbox.checked = false
        })
      }
      toggleCheckbox(checkbox) {
        checkbox.checked = !checkbox.checked
      }
      toggleCheckboxList(list) {
        if (this.checkboxState === true) {
          this.uncheckAll(list)
          return
        }
        this.checkAll(list)
      }
      alignUsernameToChildrens() {
        if (this.parent.querySelectorAll(".image-checkbox:not(:checked)").length === 0) {
          this.usernameCheckbox.checked = true
          return
        }
        this.usernameCheckbox.checked = false
      }
    }
  }
  setAllCheckboxesList() {
    this.allCheckboxesList = Array.from(document.querySelectorAll("input[type=checkbox]"))
  }
  switchState() {
    if (document.querySelectorAll("input[type=checkbox]:checked").length === 0) {
      this.EMPTY_COLLECTION_UI_STATE()
    } else if (document.querySelectorAll("input[type=checkbox]:not(:checked)").length === 0) {
      this.FULL_COLLECTION_UI_STATE()
    } else {
      this.MODIFIED_COLLECTION_UI_STATE()
    }
  }
  showPreloader() {
    if (this.preloaderIsShown === false) {
      chrome.tabs.executeScript(this.currentInstagramTabId, {
        code: `
          const canvasStyle = document.createElement("style")
          canvasStyle.textContent = "canvas {position: fixed;z-index: 1;scroll-behavior: none;width: 100% !important;height: 100% !important;top: 0;}"
          document.head.appendChild(canvasStyle)
          const preloader = document.createElement("script")
          preloader.setAttribute("type", "text/javascript")
          preloader.setAttribute("src", chrome.extension.getURL("/js/sketch-loader-for-ig.js"))
          preloader.classList.add("preloader")
          document.body.appendChild(preloader)
        canvas = document.querySelector("canvas")
        // if (canvas) {
        //   canvas.style.display = "visible"
        // }
      `
      })
      this.preloaderIsShown = true
    }
  }
  hidePreloader() {
    this.preloaderIsShown = false
    chrome.tabs.executeScript(this.currentInstagramTabId, {
      code: `
            const canvas = document.querySelector("canvas")
            canvas.style.display = "none"
            `
    })
  }
  INPROGRESS_UI_STATE() {
    this.showPreloader()
    this.controls.intro.classList.add("hidden")
    this.controls.startButton.textContent = "abort"
    this.controls.downloadButton.classList.add("hidden")
    this.controls.deselectAllButton.classList.add("hidden")
    this.controls.loadingContainer.classList.remove("hidden")
    this.controls.loadingIndicator.textContent = ""
    this.controls.authorCardContainer.classList.add("hidden")
    this.state = "INPROGRESS_UI_STATE"
  }
  COMPLETED_UI_STATE() {
    this.hidePreloader()
    this.controls.startButton.textContent = "try again"
    this.controls.downloadButton.classList.remove("hidden")
    this.controls.deselectAllButton.classList.add("hidden")
    this.controls.loadingIndicator.textContent = "completed"
    this.controls.authorCardContainer.classList.remove("hidden")
    this.state = "COMPLETED_UI_STATE"
  }
  REVERTED_UI_STATE() {
    this.hidePreloader()
    this.controls.title.textContent = "Download saved posts"
    this.controls.intro.classList.add("hidden")
    this.controls.startButton.textContent = "try again"
    this.controls.downloadButton.classList.add("hidden")
    this.controls.deselectAllButton.classList.add("hidden")
    this.controls.loadingContainer.classList.add("hidden")
    this.controls.loadingIndicator.textContent = ""
    this.controls.authorCardContainer.classList.add("hidden")
    this.state = "REVERTED_UI_STATE"
  }
  BACKING_COLLECTION_UI_STATE() {
    this.controls.downloadButton.textContent = "backing..."
    this.controls.downloadButton.setAttribute("disabled", "")
    this.controls.deselectAllButton.classList.add("hidden")
    this.state = "BACKING_COLLECTION_UI_STATE"
  }
  EMPTY_COLLECTION_UI_STATE() {
    this.controls.downloadButton.textContent = "nothing to download"
    this.controls.downloadButton.setAttribute("disabled", "")
    this.controls.deselectAllButton.classList.remove("hidden")
    this.controls.deselectAllButton.textContent = "check all"
    this.state = "EMPTY_COLLECTION_UI_STATE"
  }
  FULL_COLLECTION_UI_STATE() {
    this.controls.downloadButton.textContent = "download all"
    this.controls.downloadButton.removeAttribute("disabled", "")
    this.controls.deselectAllButton.classList.remove("hidden")
    this.controls.deselectAllButton.textContent = "uncheck all"
    this.state = "FULL_COLLECTION_UI_STATE"
  }
  MODIFIED_COLLECTION_UI_STATE() {
    this.controls.downloadButton.textContent = "download selected"
    this.controls.downloadButton.removeAttribute("disabled", "")
    this.controls.deselectAllButton.classList.remove("hidden")
    this.controls.deselectAllButton.textContent = "uncheck all"
    this.state = "MODIFIED_COLLECTION_UI_STATE"
  }
}

export {
  Controls,
  State
}
