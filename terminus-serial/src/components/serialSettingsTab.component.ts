import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, ElectronService, HostAppService } from 'terminus-core'
import { SerialConnection, SerialConnectionGroup } from '../api'
import { EditConnectionModalComponent } from './editConnectionModal.component'
import { PromptModalComponent } from './promptModal.component'

/** @hidden */
@Component({
    template: require('./serialSettingsTab.component.pug'),
})
export class SerialSettingsTabComponent {
    connections: SerialConnection[]
    childGroups: SerialConnectionGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private ngbModal: NgbModal,
    ) {
        this.connections = this.config.store.serial.connections
        this.refresh()
    }

    createConnection () {
        const connection: SerialConnection = {
            name: '',
            group: null,
            port: '',
            baudrate: 115200,
            databits: 8,
            parity: 'none',
            rtscts: false,
            stopbits: 1,
            xany: false,
            xoff: false,
            xon: false,
        }

        const modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = connection
        modal.result.then(result => {
            this.connections.push(result)
            this.config.store.serial.connections = this.connections
            this.config.save()
            this.refresh()
        })
    }

    editConnection (connection: SerialConnection) {
        const modal = this.ngbModal.open(EditConnectionModalComponent, { size: 'lg' })
        modal.componentInstance.connection = Object.assign({}, connection)
        modal.result.then(result => {
            Object.assign(connection, result)
            this.config.store.serial.connections = this.connections
            this.config.save()
            this.refresh()
        })
    }

    async deleteConnection (connection: SerialConnection) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Delete "${connection.name}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.connections = this.connections.filter(x => x !== connection)
            this.config.store.serial.connections = this.connections
            this.config.save()
            this.refresh()
        }
    }

    editGroup (group: SerialConnectionGroup) {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'New group name'
        modal.componentInstance.value = group.name
        modal.result.then(result => {
            if (result) {
                for (const connection of this.connections.filter(x => x.group === group.name)) {
                    connection.group = result.value
                }
                this.config.store.serial.connections = this.connections
                this.config.save()
                this.refresh()
            }
        })
    }

    async deleteGroup (group: SerialConnectionGroup) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Delete "${group}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            for (const connection of this.connections.filter(x => x.group === group.name)) {
                connection.group = null
            }
            this.config.save()
            this.refresh()
        }
    }

    refresh () {
        this.connections = this.config.store.serial.connections
        this.childGroups = []

        for (const connection of this.connections) {
            connection.group = connection.group || null
            let group = this.childGroups.find(x => x.name === connection.group)
            if (!group) {
                group = {
                    name: connection.group!,
                    connections: [],
                }
                this.childGroups.push(group!)
            }
            group.connections.push(connection)
        }
    }
}
