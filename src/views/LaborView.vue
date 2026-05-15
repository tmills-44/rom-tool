<template>
  <div class="view">
    <div v-for="contractor in rom.contractors" :key="contractor.id" class="contractor-block">
      <div class="contractor-header">
        <h2>{{ contractor.name }}</h2>
        <label v-if="!contractor.isGov" class="quote-label">
          <input type="checkbox" v-model="contractor.quoteProvided" />
          Quote Provided?
        </label>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-role">Role</th>
              <th class="col-num">Persons</th>
              <th class="col-num">Days</th>
              <th class="col-num">Hrs/Day</th>
              <th class="col-num">Hrs/Person</th>
              <th class="col-num">Total Hrs</th>
              <th class="col-num">Rate</th>
              <th class="col-num">Cost</th>
              <th class="col-cat">Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in contractor.labor" :key="i">
              <td>{{ row.role }}</td>
              <td><input type="number" min="0" v-model.number="row.persons" class="num-input" /></td>
              <td><input type="number" min="0" v-model.number="row.days" class="num-input" /></td>
              <td><input type="number" min="0" v-model.number="row.hoursPerDay" class="num-input small" /></td>
              <td class="calc">{{ fmt(rom.laborHoursPerPerson(row)) }}</td>
              <td class="calc">{{ fmt(rom.laborTotalHours(row)) }}</td>
              <td>
                <div class="rate-cell">
                  $<input type="number" min="0" v-model.number="row.rate" class="num-input small" />
                </div>
              </td>
              <td class="cost-cell">{{ fmtCurrency(rom.laborCost(row)) }}</td>
              <td class="cat-cell">{{ row.category }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="7" class="total-label">Total</td>
              <td class="cost-cell total-val">{{ fmtCurrency(rom.contractorLaborTotal(contractor)) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="summary-bar">
      <span>Government Labor: <strong>{{ fmtCurrency(rom.laborGovTotal) }}</strong></span>
      <span>Contractor Labor: <strong>{{ fmtCurrency(rom.laborContractorTotal) }}</strong></span>
      <span class="grand">Labor Total: <strong>{{ fmtCurrency(rom.laborTotal) }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { useRomStore } from '../stores/rom'
const rom = useRomStore()

function fmt(n) { return Number(n).toLocaleString() }
function fmtCurrency(n) {
  return n === 0 ? '-' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
