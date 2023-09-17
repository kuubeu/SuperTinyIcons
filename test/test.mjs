import { describe, it, test } from 'node:test'
import assert from 'node:assert'
import { readdirSync, readFileSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import vnu from 'vnu-jar'

const svgDir = 'images/svg/'


console.log('Getting file sizes from README')

const readmeLines = readFileSync('README.md').toString().split('\n')
const readmeRegex = /<td>.*\/svg\/(.*\.svg).*<br>(\d+) bytes/
const fileSizeMap = new Map()

for (const line of readmeLines) {
  const match = readmeRegex.exec(line)
  if (match) {
    const filename = match[1]
    const size = parseInt(match[2])
    fileSizeMap.set(filename, size)
  }
}


console.log('Validating SVGs with the W3C validator (vnu)')

const validationErrorsMap = new Map()

const args = [
  '-jar', vnu,
  '--skip-non-svg',
  '--filterpattern', '.*aria-label.*',
  svgDir
]

try {
  execFileSync('java', args)
} catch (error) {
  const errors = error.message.split('\n').filter(line => line)
  for (const error of errors) {
    const match = /svg\/((.*\.svg).*)/.exec(error)
    if (match) validationErrorsMap.set(match[2], match[1])
  }
}


console.log('Running tests')

const files = readdirSync(svgDir)

files.forEach(filename => {
  if (!filename.endsWith('.svg')) return

  const filesize = statSync(svgDir + filename).size
  const readmesize = fileSizeMap.get(filename)
  fileSizeMap.delete(filename)

  describe(filename, () => {
    it('should be under 1KB', () => {
      assert(filesize < 1024)
    })

    it('should be included in readme', () => {
      assert.ok(typeof readmesize === 'number')
    })

    it('should match readme size', () => {
      assert.strictEqual(filesize, readmesize)
    })

    it('should be validated by the w3c validator', () => {
      assert.ok(!validationErrorsMap.get(filename))
    })
  })
})

test('all files in readme should exist', () => {
  assert.deepStrictEqual(fileSizeMap, new Map())
})
