const weaponsData = {
	lasers: {
		basic_laser: 10,
		burst_laser_1: 11,
		burst_laser_2: 12,
		burst_laser_3: 19,
		heavy_laser_1: 9,
		heavy_laser_2: 13,
		charge_laser_1: 6,
		charge_laser_2: 5,
		chain_laser: [16, 13, 10, 7],
		vulcan: [11.1, 9.1, 7.1, 5.1, 3.1, 1.1]
	},
	flak: {
		flak_1: 10,
		flak_2: 21
	},
	ion: {
		ion_blast_1: 8,
		ion_blast_2: 4,
		heavy_ion: 13,
		ion_stunner: 10,
		chain_ion: 14,
		charge_ion: 6,
	},
	beams: {
		mini_beam: 12,
		hull_beam: 14,
		pike_beam: 16,
		halberd_beam: 17,
		glaive_beam: 25,
		fire_beam: 20
	},
	missiles: {
		leto_missile: 9,
		artemis_missile: 10,
		hermes_missile: 14,
		breach_missile: 22,
		swarm_missile: 7
	},
	bombs: {
		small_bomb: 13,
		fire_bomb: 15,
		stun_bomb: 17,
		ion_bomb: 22,
		lockdown_bomb: 15
	},
	crystal: {
		crystal_burst_1: 15,
		crystal_burst_2: 17,
		crystal_heavy_1: 13,
		crystal_heavy_2: 19
	}
}

const balanceModSource = {
	lasers: {
		burst_laser_3: 18,
		charge_laser_2: 4.5,
		chain_laser: [15, 12, 9, 6]
	},
	ion: {
		heavy_ion: 12,
		chain_ion: 12.5
	},
	beams: {
		halberd_beam: 18,
		fire_beam: 19
	},
	missiles: {
		breach_missile: 21,
		swarm_missile: 7
	},			
	bombs: {
		ion_bomb: 21,
		stun_bomb: 12,
		lockdown_bomb: 13
	},
	crystal: {
		crystal_burst_2: 14
	}			
}

Vue.component('treeselect', VueTreeselect.Treeselect)

var app = new Vue({
	el: '#app',
	data: {
		value1: null,
		value2: null,
		value3: null,
		value4: null,
		clearable: 'clearable',
		data: weaponsData,
		balanceModSource: balanceModSource,
		balanceMod: false,
		timeLimit: 50,
		manning: false,
		missiles: 10
	},
	computed: {
		weaponsCount() {
			let count = 0
			for (i=0; i<5; i++) {
				if (this['value'+i] != null) {
					count++
				}
			}
			return count
		},
		source() {
			return this.balanceMod ? this.balanceModData : this.data
		},
		bonus() {
			return this.manning ? 0.9 : 1
		},
		balanceModData() {
			result = {}
			entries = Object.entries(this.data)
			for(let i=0; i<entries.length; i++) {
				result[entries[i][0]] = this.mergeBalanceMod(
					entries[i][0], entries[i][1]
				)
			}
			return result
		},
		options() {
			let weapons = Object.entries(this.source)
			const result = []

			for (const [category, items] of weapons) {
				contents = []
				itemsArray = Object.entries(items)

				for (const [name, time] of itemsArray) {
					contents.push({
						id: category + '.' + name,
						label: this.readableName(name),
					})
				}

				result.push({
					id: category,
					label: this.readableName(category),
					children: contents
				}) 
			}
			return result
		}
	},
	methods: {
		weapons() {
			let result = [{name: '-'},{name: '-'},{name: '-'},{name: '-'}]
			for(let i=1; i<5; i++) {
				if (this['value'+i] != null) {
					result[i-1] = this.retrieveWeapon(this['value'+i])
				}
			}
			return result
		},
		timings() {
			let times = []

			for(let i=1; i<5; i++) {
				if (this['value'+i] != null) {
					times = times.concat(this.weaponTimes(this['value'+i]))
				}
			}

			times.sort((a,b) => a.time - b.time)
			let ammoTimes = this.limitMissiles(times)
			return this.combine(ammoTimes)
		},
		weaponTimes(weapon) {
			let result = []
			let time = 0
			let volley = 1
			let path = weapon.split('.')
			let name = this.readableName(path[1])
			let cooldown = this.source[path[0]][path[1]]

			while(time <= this.timeLimit) {
				time = this.totalTime(volley, cooldown)
				if(time <= this.timeLimit) {
					result.push({
						time: time,
						name: name,
						usesMissile: this.usesMissiles(path[0], path[1])
					})
				}
				volley++
			}

			return result
		},
		usesMissiles(type, name) {
			return type == 'bombs' || (type == 'missiles' && name != 'swarm_missile')
		},
		limitMissiles(shots) {
			let missilesFired = 0
			let result = []
			for(let i=0; i<shots.length; i++) {
				if (shots[i].usesMissile) {
					if (missilesFired < this.missiles) {
						result.push(shots[i])
						missilesFired++
					}
				} else {
					result.push(shots[i])
				}
			}
			return result
		},
		combine(shots) {
			let result = []
			for(let i=0; i<shots.length; i++) {
				if (!shots[i]) {
					break
				}
				let matchCount = 0
				let completeName = shots[i]['name']
				for(let j=1; j<5; j++) {
					if (shots[i+j] && (shots[i]['time'] === shots[i+j]['time'])) {
						completeName += ', ' + shots[i+j]['name']
						matchCount++
					}
				}
				result.push({
					time: shots[i]['time'],
					name: completeName,
					reset: matchCount == this.weaponsCount - 1 && this.weaponsCount > 1
				})
				i += matchCount
			}
			return result
		},
		retrieveWeapon(path) {
			var levels = path.split('.')
			return {
				name: this.readableName(levels[1]),
				cooldown: weaponsData[levels[0]][levels[1]],
				usesMissiles: this.usesMissiles(levels[0], levels[1]) ? true : false
			}
		},
		totalTime(volley, cooldown) {
			if (typeof(cooldown) == 'object') {
				return this.chainTotal(volley, cooldown)
			}
			return (1000*cooldown*this.bonus*(volley))/1000
		},
		chainTotal(volley, cooldown) {
			total = 0
			finalSpeed = 1000*this.bonus*cooldown.slice(-1)[0]
			for(let i=0; i<volley; i++) {
				if (i < cooldown.length) {
					total += 1000*this.bonus*cooldown[i]
				} else {
					total += finalSpeed
				}
			}
			return total/1000
		},
		readableName(name) {
			name = name.replace(/_/gi, ' ')
			return name.charAt(0).toUpperCase() + name.slice(1);
		},
		mergeBalanceMod(weaponClass, weapons) {
			if(!(weaponClass in this.balanceModSource)) {
				return weapons
			}
			balanceMod = this.balanceModSource[weaponClass]
			return {...weapons, ...balanceMod }
		}
	}
})
