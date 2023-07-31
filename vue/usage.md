```python
AppUtils(base = "/foo", export_fn_fe=True).wrap_app(app)
```
Add a container for IIB
```diff
+ gr.HTML("error", elem_id="bar_iib_container")
- gr.HTML("error", elem_id="infinite_image_browsing_container_wrapper")
```

Load index.js on the browser side.
```js
const jscodeResp = await fetch("/file?path=/path/to/your/submodue-iib/index.js") // fake api
const jsText = await jscodeResp.text()
const js = jsText
  .replace("__iib_root_container__", "'#bar_iib_container'")
  .replace("__iib_should_maximize__", "false")
  .replace(/\/infinite_image_browsing/g, "/foo")
eval(js)
```
 


```js
const iib = gradioApp().querySelector('#bar_iib_container iframe').contentWindow

const { insertTabPane, getTabList, getPageRef, createGridViewFile: f } = iib
// The createGridViewFile function is a helper function that simplifies the creation of a FileNodeInfo object.
const files = [
  // Create an array of files with their corresponding tags.
  f('/path/to/img/1', ['tag1', 'tag2']),
  f('/path/to/img/2', ['tag3', 'tag4', 'tag6']),
  f('/path/to/img/3', ['tag2', 'tag5']),
  f('/path/to/img/4', ['tag1', 'tag2'])
]

// Insert a new tab pane of grid view type and assign it to the gridView variable.
const gridView = insertTabPane({
  // Optional parameters for tab index and pane index.
  tabIdx: 0,
  paneIdx: 0,
  pane: {
    type: 'grid-view', // Other types are also available, see https://github.com/zanllp/sd-webui-infinite-image-browsing/tree/main/vue/src/store/useGlobalStore.ts#L15
    name: 'Grid View 1',
    removable: true, // Optional parameter to allow the files to be removed, default is false.
    allowDragAndDrop: true, // Optional parameter to allow drag and drop, default is false.
    files // Use the files array created earlier for this pane.
  }
})

// Retrieve the files from the gridView pane and set them back to the same pane.
const files = gridView.ref.getFiles()
gridView.ref.setFiles(files)

// Get the tab list
const tabList = getTabList()
tabList[0].panes.key

// Get the file list from the first pane of the first tab.
const pane = tabList[0].panes[0]
getPageRef(pane.key).getFiles()

// Insert a new tab pane of local type with the specified directory path.
const localDirPane = insertTabPane({
  pane: {
    type: 'local',
    path: 'E:/_归档/green'
  }
})
localDirPane.ref.close() // Closes the newly created tab pane
```

To learn more information, you can refer to the type definition in the following file: https://github.com/zanllp/sd-webui-infinite-image-browsing/tree/main/vue/src/store/useGlobalStore.ts#L15 and this file: [define](./src//defineExportFunc.ts).