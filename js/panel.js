import {
  Controls,
  State
} from "./state.js"

const controls = new Controls()
const state = new State(controls)

let application = {
  controls: controls,
  state: state,
  mainListener: undefined,
  links: undefined,
  zip: new JSZip(),
  counter: 0,
  promises: [],
  peeps: ["pee...", "poo...", "peep...", "pup...", "pep...", "beeb...", "bob..."],

  getCurrentTabId() {
    chrome.tabs.query({
      currentWindow: true,
      active: true
    }, (tabs) => {
      this.state["currentInstagramTabId"] = tabs[0].id
    })
  },
  scrollPage() {
    chrome.tabs.executeScript(state.currentInstagramTabId, {
      code: `
        window.scrollTo({
          top: document.body.scrollHeight,
          behaviour: "smooth"
        })
    `
    })
  },
  scrollPageWithDelay(delay) {
    setTimeout(this.scrollPage, delay)
  },
  bakeArchive(selected) {
    this.zip.files = {}
    state.lastState = state.state
    state.BACKING_COLLECTION_UI_STATE()
    for (const username in selected) {
      const folder = this.zip.folder(`${username}`)

      selected[username].forEach(url => {
        const imageToDownoad = new Promise(function (resolve, reject) {
          JSZipUtils.getBinaryContent(url, function (err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        })

        this.promises = [...this.promises, imageToDownoad]

        imageToDownoad.then((data, link) => {
          let fileName = data.byteLength
          this.counter += 1
          controls.loadingIndicator.textContent = `chopping ${this.counter}’th image of ${this.promises.length}`
          folder.file(`${fileName}.jpg`, data, {
            binary: true
          })
        })
      })
    }
    Promise.all(this.promises)
      .then(() => {
        this.zip.generateAsync({
            type: "blob"
          })
          .then((content) => {
            saveAs(content, "saved-posts.zip");
            controls.downloadButton.classList.remove("hidden")
            // controls.downloadButton.addEventListener("click", function () {
            //   saveAs(content, "saved-posts.zip");
            // })
            controls.loadingIndicator.textContent = "completed"
            state.state = state.lastState
            state.switchState()
            this.promises = []
            this.counter = 0
          })
      })
  }
}

controls.startButton.addEventListener("click", () => {
  if (state.isRunning === true && state.state === "INPROGRESS_UI_STATE") {
    state.isRunning = false
    state.REVERTED_UI_STATE()
    chrome.devtools.network.onRequestFinished.removeListener(application.mainListener)
    return
  }

  application.state.isRunning = true

  let cachedLinks = []
  let processed = []

  application.getCurrentTabId()
  chrome.tabs.reload()

  chrome.devtools.network.onRequestFinished.addListener(application.mainListener = (request) => {
    if (state.preloaderIsShown === false) state.INPROGRESS_UI_STATE()
    controls.loadingIndicator.textContent += application.peeps[Math.floor(Math.random() * application.peeps.length)]

    if (request.request.url.includes("?no_raven=1")) application.scrollPageWithDelay(1500)

    if (request.request.url.includes("?max_id=")) {
      request.getContent((body, encoding) => {
        if (body) {
          if (processed.includes(request.request.url) === false) {
            processed = [...processed, request.request.url]
            const data = JSON.parse(body).items
            data.map((post) => {
              if (post.media.carousel_media) {
                let links = []
                post.media.carousel_media.forEach((carousel_media) => {
                  links.push(carousel_media.image_versions2.candidates[0].url)
                })
                cachedLinks = [...cachedLinks, [post.media.user.username, links]]
                return
              }
              cachedLinks = [...cachedLinks, [post.media.user.username, [post.media.image_versions2.candidates[0].url]]]
            })
            controls.title.textContent = `Processed ${cachedLinks.length} saved posts`

            const moreAvailable = JSON.parse(body).more_available
            if (!moreAvailable) {

              application.links = Object.fromEntries(cachedLinks)
              cachedLinks.forEach(row => {
                application.links[row[0]] = [...new Set([...application.links[row[0]], ...row[1]])]
              })

              for (const key in application.links) {
                const card = controls.authorCard.content.cloneNode(true).children[0]
                const username = card.querySelector("[data-author-username]")
                username.textContent = key
                const imagesConatainer = card.querySelector("[data-images-container]")
                const imageElement = card.querySelector("[data-image-element]")

                application.links[key].forEach(link => {
                  const imageSelector = imageElement.content.cloneNode(true).children[0]
                  const image = imageSelector.querySelector("[data-image]")
                  image.setAttribute("src", link)
                  imagesConatainer.append(imageSelector)
                })
                controls.authorCardContainer.append(card)
              }
              state.COMPLETED_UI_STATE()
              state.FULL_COLLECTION_UI_STATE()
              state.setAllCheckboxesList()
              application.scrollPageWithDelay(1500)
              chrome.devtools.network.onRequestFinished.removeListener(application.mainListener)
            }
          }
        }
        application.scrollPageWithDelay(1500)
      })
    }
  })
})

controls.deselectAllButton.addEventListener("click", (event) => {
  const checkbox = new state.Checkbox(event)
  if (state.state === "EMPTY_COLLECTION_UI_STATE") {
    checkbox.checkAll(state.allCheckboxesList)
    state.FULL_COLLECTION_UI_STATE()
    return
  }
  checkbox.uncheckAll(state.allCheckboxesList)
  state.EMPTY_COLLECTION_UI_STATE()
})

controls.downloadButton.addEventListener("click", (event) => {
  if (state.state === "FULL_COLLECTION_UI_STATE") {
    let selected = application.links
    application.bakeArchive(selected)
    selected = {}
  } else {
    let selected = {}
    Object.assign(selected, application.links)

    const authorsChecked = Array.from(controls.authorCardContainer.querySelectorAll(".username-checkbox:checked"))
    authorsChecked.map((usernameCheckbox) => {
      const parent = usernameCheckbox.closest(".author-card")
      const username = parent.querySelector(".username").textContent
      if (!selected[username]) {
        selected[username] = application.links[username]
      }
    })
    const authorsUnchecked = Array.from(controls.authorCardContainer.querySelectorAll(".username-checkbox:not(:checked)"))
    authorsUnchecked.map((usernameCheckbox) => {
      const parent = usernameCheckbox.closest(".author-card")
      const username = parent.querySelector(".username").textContent
      let checkedImagesList = Array.from(parent.querySelectorAll(".image-checkbox:checked"))
      if (checkedImagesList.length === 0) {
        delete selected[username]
        return
      }
      checkedImagesList = checkedImagesList.map((imageCheckbox) => {
        const parent = imageCheckbox.closest(".image-selector")
        const imageUrl = parent.querySelector(".data-image").getAttribute("src")
        return imageUrl
      })
      selected[username] = checkedImagesList
    })
    application.bakeArchive(selected)
    selected = {}
  }
})

controls.authorCardContainer.addEventListener("click", (event) => {
  event.preventDefault()
})

controls.authorCardContainer.addEventListener("mousedown", (event) => {
  event.preventDefault()
  const checkbox = new state.Checkbox(event)
  state.isCursorPressed = true
  if (checkbox.usernameSelector) {
    checkbox.toggleCheckbox(checkbox.checkbox)
    checkbox.toggleCheckboxList(checkbox.usernameChildrenCheckboxesList)
    state.switchState()
    return
  }
  if (!checkbox.imageSelector) return
  checkbox.toggleCheckbox(checkbox.checkbox)
  state.shouldBeChecked = !checkbox.checkboxState
  checkbox.alignUsernameToChildrens()
  state.switchState()
})

controls.authorCardContainer.addEventListener("mouseup", (event) => {
  event.preventDefault()
  state.isCursorPressed = false
})

controls.authorCardContainer.addEventListener("mouseover", (event) => {
  event.preventDefault()
  const checkbox = new state.Checkbox(event)
  if (!checkbox.imageSelector) return
  if (state.isCursorPressed) {
    checkbox.setCheckboxState(state.shouldBeChecked)
    checkbox.alignUsernameToChildrens()
    state.switchState()
  }
})
