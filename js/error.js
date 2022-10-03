const pushUsername = document.querySelector("[data-pushUsername]")
const usernameField = document.querySelector("[data-username]")

pushUsername.addEventListener("click", function () {
  if (usernameField.value) {
    let username = document.querySelector("[data-username]").value
    let url = `https://www.instagram.com/${username}/saved/all-posts/`
    chrome.tabs.create({
      url: url
    })
  }
})
