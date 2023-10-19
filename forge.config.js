module.exports = {
  packagerConfig: {
    icon: 'src/assets/app'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        options: {
          icon: 'src/assets/app'
        }
      }
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'philipbry',
          name: 'RazerAutoPollingRate'
        },
        prerelease: false
      }
    }
  ]
};
